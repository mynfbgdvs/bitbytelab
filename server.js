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

  socket.on('join', (room) => {
    socket.join(room);
    rooms[room] = rooms[room] || {};
    rooms[room][socket.id] = { id: socket.id, x:0, y:0, z:0 };
    // send current room state to new client
    socket.emit('room_state', Object.values(rooms[room]));
    // notify others
    socket.to(room).emit('user_joined', rooms[room][socket.id]);
  });

  socket.on('leave', (room) => {
    socket.leave(room);
    if (rooms[room]) {
      delete rooms[room][socket.id];
      socket.to(room).emit('user_left', { id: socket.id });
    }
  });

  socket.on('player_update', ({ room, payload }) => {
    if (!rooms[room]) return;
    rooms[room][socket.id] = { id: socket.id, ...payload };
    socket.to(room).emit('player_update', rooms[room][socket.id]);
  });

  socket.on('disconnecting', () => {
    const joined = Array.from(socket.rooms).filter((r) => r !== socket.id);
    joined.forEach((room) => {
      if (rooms[room]) {
        delete rooms[room][socket.id];
        socket.to(room).emit('user_left', { id: socket.id });
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});