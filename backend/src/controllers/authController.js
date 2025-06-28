const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const users = require('../data/users');

const register = async (req, res) => {
  const { username, password, role = 'user' } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }
  const existing = users.find(u => u.username === username);
  if (existing) return res.status(409).json({ message: 'User exists' });
  const hashed = await bcrypt.hash(password, 10);
  const user = { id: users.length + 1, username, password: hashed, role };
  users.push(user);
  res.status(201).json({ id: user.id, username: user.username });
};

const login = async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ message: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, config.get('jwtSecret'), { expiresIn: '1h' });
  res.json({ token });
};

module.exports = { register, login };
