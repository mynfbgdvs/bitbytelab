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

// Fallback to index.html for SPA routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.IO for lightweight multiplayer sync
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  socket.on('join', (room) => {
    socket.join(room);
    socket.to(room).emit('user_joined', { id: socket.id });
  });

  socket.on('player_update', ({ room, payload }) => {
    socket.to(room).emit('player_update', { id: socket.id, ...payload });
  });

  socket.on('disconnecting', () => {
    const rooms = Array.from(socket.rooms).filter((r) => r !== socket.id);
    rooms.forEach((room) => socket.to(room).emit('user_left', { id: socket.id }));
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on http://???:${PORT}`);
});