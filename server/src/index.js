require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const api = require('./api');

const app = express();
const PORT = process.env.PORT || 8001;

// ── Middleware ───────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_2,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy does not allow access from origin ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '1mb' }));

// ── API Routes ───────────────────────────────────────────────────────
app.use('/api', api);

// ── Serve React frontend in production ──────────────────────────────
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) {
      // In dev, frontend may not be built yet — just return JSON
      res.json({ message: 'HopeVeri API — Frontend not built. Run the React dev server separately.' });
    }
  });
});

// ── Start ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 HopeVeri API running on http://127.0.0.1:${PORT}`);
  console.log(`📋 Admin seed: npm run seed`);
});

module.exports = app;
