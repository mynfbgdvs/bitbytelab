const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');

const authRoutes = require('./src/routes/auth');
const gamesRoutes = require('./src/routes/games');
const db = require('./src/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(morgan('tiny'));
app.use(express.json({ limit: '1mb' }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// API
app.use('/api/auth', authRoutes);
app.use('/api/games', gamesRoutes);

app.get('/api/status', (req, res) => res.json({ status: 'ok', timestamp: Date.now() }));

// serve uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Fallback to index.html for SPA routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// attach assets route
const assetsRoutes = require('./src/routes/assets');
app.use('/api/assets', assetsRoutes);

// Socket.IO for lightweight multiplayer sync
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, { cors: { origin: '*' } });

// track players per room
const rooms = {};

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  // initialize state holder
  socket.on('join', (room) => {
    socket.join(room);
    rooms[room] = rooms[room] || { players: {}, lastTick: Date.now() };
    rooms[room].players[socket.id] = { id: socket.id, x:0, y:2, z:0, vx:0, vy:0, vz:0, lastInputSeq: 0 };
    // send current room state to new client
    socket.emit('room_state', { players: Object.values(rooms[room].players), ts: Date.now() });
    // notify others
    socket.to(room).emit('user_joined', rooms[room].players[socket.id]);
  });

  socket.on('leave', (room) => {
    socket.leave(room);
    if (rooms[room] && rooms[room].players) {
      delete rooms[room].players[socket.id];
      socket.to(room).emit('user_left', { id: socket.id });
    }
  });

  // client sends inputs (velocity) with a sequence number
  socket.on('input', ({ room, input }) => {
    if (!rooms[room] || !rooms[room].players[socket.id]) return;
    const MAX_SPEED = 8; // server-enforced max speed to reduce cheating
    const p = rooms[room].players[socket.id];
    // clamp velocities
    p.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, input.vx || 0));
    p.vy = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, input.vy || 0));
    p.vz = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, input.vz || 0));
    if (typeof input.seq === 'number') p.lastInputSeq = input.seq;
    p.lastInputTs = input.ts || Date.now();
  });

  socket.on('disconnecting', () => {
    const joined = Array.from(socket.rooms).filter((r) => r !== socket.id);
    joined.forEach((room) => {
      if (rooms[room] && rooms[room].players) {
        delete rooms[room].players[socket.id];
        socket.to(room).emit('user_left', { id: socket.id });
      }
    });
  });
});

// authoritative tick: integrate inputs and broadcast full state
setInterval(() => {
  const now = Date.now();
  Object.keys(rooms).forEach((roomId) => {
    const room = rooms[roomId];
    const players = room.players || {};
    const dt = (now - (room.lastTick || now)) / 1000;
    room.lastTick = now;
    if (dt <= 0) return;

    // integrate
    Object.keys(players).forEach((pid) => {
      const p = players[pid];
      // simple integration
      p.x += (p.vx || 0) * dt;
      p.y += (p.vy || 0) * dt;
      p.z += (p.vz || 0) * dt;
      p.updatedAt = now;
    });

    // broadcast authoritative snapshot
    const snapshot = { ts: now, players: Object.values(players) };
    io.to(roomId).emit('state', snapshot);
  });
}, 50); // 20Hz

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});