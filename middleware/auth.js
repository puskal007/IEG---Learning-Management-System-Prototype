const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Access token required' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const users = await query(
      'SELECT id, name, email, role, status FROM users WHERE id = ? AND status = "active"',
      [decoded.id]
    );
    if (!users || users.length === 0)
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    req.user = { ...decoded, ...users[0] };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return res.status(401).json({ success: false, message: 'Token expired' });
    return res.status(403).json({ success: false, message: 'Invalid token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role === 'admin') return next();
  return res.status(403).json({ success: false, message: 'Admin access required' });
};

const teacherOnly = (req, res, next) => {
  if (req.user?.role === 'teacher' || req.user?.role === 'admin') return next();
  return res.status(403).json({ success: false, message: 'Teacher access required' });
};

const adminOrTeacher = (req, res, next) => {
  if (['admin', 'teacher'].includes(req.user?.role)) return next();
  return res.status(403).json({ success: false, message: 'Admin or Teacher access required' });
};

module.exports = { auth, adminOnly, teacherOnly, adminOrTeacher };