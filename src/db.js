const fs = require('fs');
const path = require('path');
const { nanoid } = require('nanoid');

const DB_FILE = path.join(__dirname, '..', 'db.json');

function read() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return { users: [], games: [] };
  }
}

function write(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

module.exports = {
  getUsers() { return read().users; },
  getUserByEmail(email) { return read().users.find(u => u.email === email); },
  getUserById(id) { return read().users.find(u => u.id === id); },
  createUser({ name, email, passwordHash }) {
    const db = read();
    const user = { id: nanoid(8), name, email, passwordHash, createdAt: new Date().toISOString() };
    db.users.push(user);
    write(db);
    return user;
  },
  getGames() { return read().games; },
  getGameById(id) { return read().games.find(g => g.id === id); },
  createGame({ title, authorId, data }) {
    const db = read();
    const game = { id: nanoid(8), title, authorId, data, createdAt: new Date().toISOString() };
    db.games.push(game);
    write(db);
    return game;
  }
};