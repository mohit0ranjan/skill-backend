require('dotenv').config();

const fs = require('fs');
const path = require('path');

let app;
let prisma;

try {
  app = require('./app');
  prisma = require('./prisma');
} catch (err) {
  console.error('[startup] Failed to initialize app/prisma modules:', err);
  process.exit(1);
}

const PORT = Number.parseInt(process.env.PORT, 10) || 5000;
const HOST = '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

const server = app.listen(PORT, HOST, () => {
  console.log(`SkillBridge API listening on ${HOST}:${PORT} (${NODE_ENV})`);
  console.log(`Health check: http://${HOST}:${PORT}/health`);

  // Non-blocking DB connectivity probe after HTTP server is up.
  if (typeof prisma.testConnection === 'function') {
    prisma.testConnection().catch(() => {});
  }
});

function shutdown(signal) {
  console.log(`\\n${signal} received. Starting graceful shutdown...`);

  server.close(async (err) => {
    if (err) {
      console.error('Error during server shutdown:', err);
      process.exit(1);
      return;
    }

    try {
      if (typeof prisma.disconnect === 'function') {
        await prisma.disconnect();
      }
    } catch (e) {
      console.error('Error closing database pool:', e.message);
    }

    console.log('HTTP server closed cleanly.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forcing shutdown after timeout.');
    process.exit(1);
  }, 15000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  setTimeout(() => process.exit(1), 1000).unref();
});
