require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { ApiResponse, ApiError } = require('./utils/apiResponse');
const prisma = require('./prisma');

const authRoutes = require('./routes/auth');
const internshipRoutes = require('./routes/internships');
const userRoutes = require('./routes/user');
const taskRoutes = require('./routes/tasks');
const learningRoutes = require('./routes/learning');
const certificateRoutes = require('./routes/certificates');
const ticketRoutes = require('./routes/tickets');
const adminRoutes = require('./routes/admin');

const app = express();

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet: Set various HTTP headers for security
app.use(helmet());

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// CORS — restrict to frontend origin in production
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, health checks, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
}));

// ============================================
// REQUEST PARSING
// ============================================

// Razorpay webhook needs the raw body before JSON parsing consumes the stream.
app.use('/razorpay-webhook', express.raw({ type: 'application/json' }));

// Body parsing with size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ============================================
// RATE LIMITING
// ============================================

// Global rate limiter for all requests
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (req.path === '/health' || req.path === '/') return true;

    // These are read-only dashboard/data endpoints that can be hit frequently
    // during development and page hydration. Keep them available so UI loads
    // do not fail with rate-limit errors.
    if (req.method === 'GET' && (
      req.path === '/dashboard' ||
      req.path.startsWith('/learning-plan') ||
      req.path.startsWith('/internships') ||
      req.path.startsWith('/certificate') ||
      req.path.startsWith('/verify') ||
      req.path.startsWith('/admin/dashboard') ||
      req.path.startsWith('/admin/certificates')
    )) {
      return true;
    }

    return false;
  },
});

app.use(globalLimiter);

// Auth-specific rate limiter (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// REQUEST LOGGING MIDDLEWARE
// ============================================

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = `[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`;
    if (res.statusCode >= 400) {
      console.error(log);
    }
  });
  next();
});

// ============================================
// HEALTH & ROOT ENDPOINTS
// ============================================

/**
 * Health Check — includes DB connectivity test for Azure monitoring
 */
app.get('/health', async (req, res) => {
  const dbOk = await prisma.testConnection();
  const status = dbOk ? 'ok' : 'degraded';
  const httpCode = dbOk ? 200 : 503;

  res.status(httpCode).json(ApiResponse.success({
    status,
    uptime: Math.floor(process.uptime()),
    database: dbOk ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  }));
});

/**
 * Root endpoint
 */
app.get('/', (req, res) => {
  res.json(ApiResponse.success({
    status: 'ok',
    service: 'SkillBridge API',
    version: '1.0.0',
    health: '/health',
    docs: '/api/docs',
  }));
});

/**
 * Favicon (avoid noisy 404 logs for browser auto-requests)
 */
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

/**
 * Api Documentation
 */
app.get('/api/docs', (req, res) => {
  const docs = {
    api: 'SkillBridge API v1',
    baseUrl: process.env.BACKEND_URL || 'http://localhost:5000',
    endpoints: {
      auth: '/auth',
      internships: '/internships',
      dashboard: '/dashboard',
      certificates: '/certificates',
      payments: '/create-order, /verify-payment',
    },
    docs: 'See README.md for full documentation',
  };
  res.json(ApiResponse.success(docs));
});

// ============================================
// API ROUTES
// ============================================

app.use('/auth', authLimiter, authRoutes);
app.use('/internships', internshipRoutes);
app.use('/', userRoutes);
app.use('/', taskRoutes);
app.use('/', learningRoutes);
app.use('/', certificateRoutes);
app.use('/', ticketRoutes);
app.use('/admin', adminRoutes);

// ============================================
// ERROR HANDLING
// ============================================

/**
 * 404 Not Found Handler
 */
app.use((req, res) => {
  const response = ApiResponse.error(
    `Route ${req.method} ${req.path} not found`,
    404,
    'NOT_FOUND'
  );
  res.status(404).json(response);
});

/**
 * Centralized Error Handler (MUST BE LAST)
 */
app.use((err, req, res, next) => {
  // Handle ApiError instances
  if (err instanceof ApiError) {
    const response = ApiResponse.error(
      err.message,
      err.statusCode || 400,
      err.errorCode || 'ERROR',
      err.details
    );
    return res.status(err.statusCode || 400).json(response);
  }

  // Handle Joi validation errors
  if (err.name === 'ValidationError') {
    const response = ApiResponse.error(
      'Validation failed',
      400,
      'VALIDATION_ERROR',
      err.details
    );
    return res.status(400).json(response);
  }

  // Handle Prisma errors
  if (err.code && err.code.startsWith('P')) {
    const response = ApiResponse.error(
      'Database error',
      500,
      'DATABASE_ERROR',
      process.env.NODE_ENV === 'development' ? err.message : null
    );
    return res.status(500).json(response);
  }

  // Generic error handler
  console.error('🔴 Unhandled error:', err);
  const response = ApiResponse.error(
    'Internal server error',
    500,
    'INTERNAL_ERROR',
    process.env.NODE_ENV === 'development' ? err.message : null
  );
  res.status(500).json(response);
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'production';
let server;

// Azure runs `node app.js` directly → require.main === module is TRUE.
// Tests do `require('./app')` → require.main !== module, so listen is skipped.
if (require.main === module) {
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════╗
║     🚀 SkillBridge API Server 🚀      ║
╠════════════════════════════════════════╣
║  Environment: ${NODE_ENV.padEnd(28)} ║
║  Port: ${PORT.toString().padEnd(33)} ║
║  Status: ✅ Running                   ║
╚════════════════════════════════════════╝
    `);
    console.log(`📍 API: http://0.0.0.0:${PORT}`);
    console.log(`📍 Health: http://0.0.0.0:${PORT}/health`);
    console.log(`📍 Docs: http://0.0.0.0:${PORT}/api/docs`);

    // Non-blocking DB connection test logged after startup
    if (typeof prisma.testConnection === 'function') {
      prisma.testConnection().catch(() => {});
    }
  });
}

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

function shutdown(signal) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  if (!server) {
    process.exit(0);
    return;
  }

  server.close(async (err) => {
    if (err) {
      console.error('Error during server shutdown:', err);
      process.exit(1);
      return;
    }

    // Disconnect Prisma pool
    try {
      if (typeof prisma.disconnect === 'function') {
        await prisma.disconnect();
        console.log('Database pool closed.');
      }
    } catch (e) {
      console.error('Error closing database pool:', e.message);
    }

    console.log('HTTP server closed cleanly.');
    process.exit(0);
  });

  // Force exit if graceful shutdown takes too long.
  setTimeout(() => {
    console.error('Forcing shutdown after timeout.');
    process.exit(1);
  }, 15000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔴 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('🔴 Uncaught Exception:', err);
  // Give time for logs to flush before exiting
  setTimeout(() => process.exit(1), 1000).unref();
});

module.exports = app;

