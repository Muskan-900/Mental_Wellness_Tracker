require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initDb } = require('./config/db');
const apiRouter = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet());
app.use(cors({
  origin: '*', // For development flexibility; can restrict to frontend URL in production
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiting (Security NFR)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});
app.use('/api/', limiter);

// Request body parser (max 1mb to prevent large file attacks - Security NFR)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date(), uptime: process.uptime() });
});

// Mount API Routes
app.use('/api', apiRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).json({ error: 'Something went wrong on our end. Please try again later.' });
});

// Run Migrations and Start Server (only if not running tests)
if (process.env.NODE_ENV !== 'test') {
  initDb()
    .then(() => {
      if (!process.env.VERCEL) {
        app.listen(PORT, () => {
          console.log(`MindPulse AI Server running on port ${PORT} 🚀`);
        });
      }
    })
    .catch((err) => {
      console.error('Critical: Failed to initialize database migration.', err);
      if (!process.env.VERCEL) {
        process.exit(1);
      }
    });
}

module.exports = app;
