const express = require('express');
const auth = require('../middleware/auth');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const games = db.getGames().map(g => ({ id: g.id, title: g.title, authorId: g.authorId, createdAt: g.createdAt }));
  res.json(games);
});

router.get('/:id', (req, res) => {
  const game = db.getGameById(req.params.id);
  if (!game) return res.status(404).json({ error: 'not found' });
  res.json(game);
});

router.post('/', auth, (req, res) => {
  const { title, data } = req.body || {};
  if (!title || !data) return res.status(400).json({ error: 'title and data required' });
  const game = db.createGame({ title, authorId: req.user.id, data });
  res.json(game);
});

module.exports = router;