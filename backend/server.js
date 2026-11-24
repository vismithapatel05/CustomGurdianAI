require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { errorHandler } = require('./middleware/errorHandler');

const uploadRoutes = require('./routes/upload');
const extractRoutes = require('./routes/extract');
const compareRoutes = require('./routes/compare');
const reportRoutes = require('./routes/report');
const historyRoutes = require('./routes/history');
const validationRoutes = require('./routes/validation');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/extract', extractRoutes);
app.use('/api/compare', compareRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/validation', validationRoutes);

// Health check — also reports API key status
app.get('/api/health', (req, res) => {
  const { isApiKeyConfigured } = require('./services/llmService');
  const keyOk = isApiKeyConfigured();
  res.json({
    status: 'ok',
    version: '1.0.0',
    service: 'CustomsGuardian AI Backend',
    timestamp: new Date().toISOString(),
    llmApiKey: keyOk ? 'configured' : 'missing',
    ...(keyOk ? {} : {
      setupRequired: true,
      message: 'Add your GROQ_API_KEY or OPENROUTER_API_KEY to backend/.env (or run Ollama locally).',
    }),
  });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  const { isApiKeyConfigured } = require('./services/llmService');
  const keyOk = isApiKeyConfigured();

  console.log(`\n🛡️  CustomsGuardian AI Backend running on http://localhost:${PORT}`);
  console.log(`📁  Uploads directory: ${uploadsDir}`);

  if (keyOk) {
    console.log(`🤖  LLM Stack: ✅ Configured\n`);
  } else {
    console.log(`🤖  LLM Stack: ⚠️ NO CLOUD KEYS SET`);
    console.log(`\n  ┌─────────────────────────────────────────────────┐`);
    console.log(`  │  ⚠️  ACTION REQUIRED: Set your LLM API keys     │`);
    console.log(`  │                                                  │`);
    console.log(`  │  1. Open: backend/.env                           │`);
    console.log(`  │  2. Add: GROQ_API_KEY or OPENROUTER_API_KEY      │`);
    console.log(`  │     (or ensure Ollama is running locally)        │`);
    console.log(`  └─────────────────────────────────────────────────┘\n`);
  }
});

module.exports = app;
