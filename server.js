const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const db = require('./config/database');
const app = express();

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { success: false, message: 'Too many requests' } });
const apiLimiter  = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth',    authLimiter, require('./routes/auth'));
app.use('/api/admin',   apiLimiter,  require('./routes/admin'));
app.use('/api/teacher', apiLimiter,  require('./routes/teacher'));
app.use('/api/student', apiLimiter,  require('./routes/students'));

app.get('/api/health', async (req, res) => {
  const ok = await db.testConnection();
  res.json({ status: ok ? 'ok' : 'degraded', db: ok ? 'connected' : 'error', ts: new Date().toISOString(), version: '2.0.0' });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

async function start() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   🎓 IEG LMS — Starting...                  ║');
  console.log('╚══════════════════════════════════════════════╝\n');
  const dbOk = await db.testConnection();
  if (!dbOk) {
    console.error('❌ MySQL unavailable. Run: node scripts/init-database.js first.\n');
    process.exit(1);
  }
  app.listen(PORT, () => {
    console.log(`✅ IEG LMS running at http://localhost:${PORT}`);
    console.log(`\n  Admin:   admin@iets.edu  / Admin@123`);
    console.log(`  Teacher: teacher1@iets.edu / Teacher@123`);
    console.log(`  Student: (any seeded email) / Student@123\n`);
  });
}

start();