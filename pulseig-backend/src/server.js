require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const webhookRoutes = require('./routes/webhook.routes');
const conversationRoutes = require('./routes/conversations.routes');
const { contacts, products, triggers, dashboard } = require('./routes/resources.routes');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Seguridad ───────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// ─── Rate limiting ───────────────────────────────────────────
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api/', limiter);

// ─── Logging ─────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('[:date[clf]] :method :url :status :response-time ms'));
}

// ─── Body parsing ────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health check ────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'PulseIG API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    mode: process.env.ANTHROPIC_API_KEY ? 'live' : 'simulated',
  });
});

// ─── Rutas ───────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/webhook',       webhookRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/contacts',      contacts);
app.use('/api/products',      products);
app.use('/api/triggers',      triggers);
app.use('/api/dashboard',     dashboard);

// ─── 404 ─────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

// ─── Error global ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ─── Arrancar ────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║         PulseIG API v1.0.0               ║
╠══════════════════════════════════════════╣
║  Puerto:   ${PORT}                           ║
║  Modo:     ${process.env.ANTHROPIC_API_KEY ? 'LIVE (Claude API)' : 'SIMULADO (sin API key)'}    ║
║  DB:       ${process.env.DATABASE_URL ? 'PostgreSQL' : 'Sin configurar'}              ║
╚══════════════════════════════════════════╝
  `);
});

module.exports = app;
