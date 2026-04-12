const { PrismaClient } = require('@prisma/client');

// ---------------------------------------------------------------------------
// Singleton Prisma client – prevents multiple connection pools in
// serverless / container restarts (Azure App Service, Docker, etc.).
// ---------------------------------------------------------------------------

let prisma;

function buildClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set. Prisma client will NOT connect.');
    return new PrismaClient();
  }

  return new PrismaClient();
}

// Lazily build once & cache
function getPrisma() {
  if (!prisma) {
    prisma = buildClient();
  }
  return prisma;
}

// Optional: test connectivity (called from app.js startup)
async function testConnection() {
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    console.log('✅ Database connection verified');
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    return false;
  }
}

// Graceful disconnect (used by shutdown handler)
async function disconnect() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

// Export a proxy so existing `require('../prisma')` usage keeps working
// as though `prisma` is a plain PrismaClient instance.
module.exports = new Proxy({}, {
  get(_target, prop) {
    if (prop === 'testConnection') return testConnection;
    if (prop === 'disconnect') return disconnect;
    if (prop === 'then') return undefined; // avoid being treated as a thenable
    return getPrisma()[prop];
  },
});
