const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    const users = await query('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (!users || users.length === 0)
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    const user = users[0];
    if (user.status !== 'active')
      return res.status(403).json({ success: false, message: 'Account is inactive. Contact admin.' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    await query('UPDATE users SET last_login = NOW(), login_count = login_count + 1 WHERE id = ?', [user.id]);
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
    let extra = {};
    if (user.role === 'student') {
      const rows = await query('SELECT roll_number, semester, gpa FROM students WHERE user_id = ?', [user.id]);
      if (rows[0]) extra.studentInfo = rows[0];
    }
    if (user.role === 'teacher') {
      const rows = await query('SELECT id, department, specialization FROM teachers WHERE user_id = ?', [user.id]);
      if (rows[0]) extra.teacherInfo = rows[0];
    }
    res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, ...extra } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Name, email, and password required' });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    const existing = await query('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing.length > 0)
      return res.status(409).json({ success: false, message: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 12);
    const result = await query(
      'INSERT INTO users (name, email, password, phone, role, status, is_verified) VALUES (?, ?, ?, ?, "student", "active", 0)',
      [name, email.toLowerCase().trim(), hashed, phone || null]
    );
    const userId = result.insertId;
    const rollNumber = `IEG${String(userId).padStart(5, '0')}`;
    await query('INSERT INTO students (user_id, roll_number, semester) VALUES (?, ?, 1)', [userId, rollNumber]);
    const token = jwt.sign(
      { id: userId, role: 'student', email: email.toLowerCase().trim() },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
    res.status(201).json({ success: true, token, user: { id: userId, name, email, role: 'student' } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const users = await query(
      'SELECT id, name, email, role, phone, city, country, status, last_login FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!users[0]) return res.status(404).json({ success: false, message: 'User not found' });
    const user = users[0];
    if (user.role === 'student') {
      const rows = await query('SELECT * FROM students WHERE user_id = ?', [user.id]);
      if (rows[0]) user.studentInfo = rows[0];
    }
    if (user.role === 'teacher') {
      const rows = await query('SELECT * FROM teachers WHERE user_id = ?', [user.id]);
      if (rows[0]) user.teacherInfo = rows[0];
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/profile', auth, async (req, res) => {
  try {
    const { name, phone, city, country } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
    await query('UPDATE users SET name = ?, phone = ?, city = ?, country = ?, updated_at = NOW() WHERE id = ?',
      [name, phone || null, city || null, country || null, req.user.id]);
    res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: 'Both passwords required' });
    if (newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    const users = await query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const valid = await bcrypt.compare(currentPassword, users[0].password);
    if (!valid) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    const hashed = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id]);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;