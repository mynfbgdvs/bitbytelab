const jwt = require('jsonwebtoken');
const db = require('../db');

const SECRET = process.env.JWT_SECRET || 'dev-secret';

module.exports = function (req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'no token' });
  const parts = auth.split(' ');
  if (parts.length !== 2) return res.status(401).json({ error: 'bad token' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, SECRET);
    const user = db.getUserById(payload.id);
    if (!user) return res.status(401).json({ error: 'invalid user' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'token invalid' });
  }
};