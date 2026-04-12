require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { ApiResponse, ApiError } = require('./utils/apiResponse');

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
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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
    if (req.path === '/health') return true;

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
// WEBHOOK ROUTE (needs raw body)
// ============================================

// ============================================
// API ROUTES
// ============================================

/**
 * Health Check
 */
app.get('/health', (req, res) => {
  const response = ApiResponse.success({ status: 'ok' });
  res.json(response);
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
  const response = ApiResponse.success(docs);
  res.json(response);
});

/**
 * Routes
 */
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
const NODE_ENV = process.env.NODE_ENV || 'development';
let server;

if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║     🚀 SkillBridge API Server 🚀      ║
╠════════════════════════════════════════╣
║  Environment: ${NODE_ENV.padEnd(28)} ║
║  Port: ${PORT.toString().padEnd(33)} ║
║  Status: ✅ Running                   ║
╚════════════════════════════════════════╝
  `);
    console.log(`📍 API: http://localhost:${PORT}`);
    console.log(`📍 Health: http://localhost:${PORT}/health`);
    console.log(`📍 Docs: http://localhost:${PORT}/api/docs`);
  });
}

function shutdown(signal) {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  if (!server) {
    process.exit(0);
    return;
  }

  // Stop accepting new requests and allow in-flight requests to finish.
  server.close((err) => {
    if (err) {
      console.error('Error during server shutdown:', err);
      process.exit(1);
      return;
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

module.exports = app;
