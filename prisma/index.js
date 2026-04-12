const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

function ensurePrismaRuntime() {
  const prismaRuntimeFile = path.join(__dirname, '..', 'node_modules', '.prisma', 'client', 'default.js');
  if (fs.existsSync(prismaRuntimeFile)) {
    return;
  }

  console.warn('[prisma] Missing generated runtime. Running "npx prisma generate"...');
  execSync('npx prisma generate', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });

  if (!fs.existsSync(prismaRuntimeFile)) {
    throw new Error('Prisma runtime generation failed: node_modules/.prisma/client/default.js not found.');
  }
}

function loadPrismaClient() {
  try {
    return require('@prisma/client');
  } catch (err) {
    const isPrismaRuntimeMissing = err && err.code === 'MODULE_NOT_FOUND' && String(err.message).includes('.prisma/client/default');
    if (!isPrismaRuntimeMissing) {
      throw err;
    }

    ensurePrismaRuntime();
    return require('@prisma/client');
  }
}

const { PrismaClient } = loadPrismaClient();

// ---------------------------------------------------------------------------
// Singleton Prisma client – prevents multiple connection pools in
// serverless / container restarts (Azure App Service, Docker, etc.).
// ---------------------------------------------------------------------------

let prisma;

function buildClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set. Prisma client will NOT connect.');
    // Return a PrismaClient with no adapter; queries will fail at runtime but
    // the process won't crash during startup.
    return new PrismaClient();
  }

  // Try Accelerate first
  let accelerateUrl;
  try {
    accelerateUrl = process.env.ACCELERATE_URL || process.env.PRISMA_ACCELERATE_URL;
  } catch {
    accelerateUrl = null;
  }

  if (accelerateUrl) {
    try {
      const { withAccelerate } = require('@prisma/extension-accelerate');
      return new PrismaClient({ accelerateUrl }).$extends(withAccelerate());
    } catch (err) {
      console.warn('⚠️  Accelerate extension unavailable, falling back to direct connection:', err.message);
    }
  }

  // Direct Neon / PostgreSQL connection via pg adapter
  const pool = new Pool({
    connectionString: databaseUrl,
    // Azure / Neon best practices
    max: 5,                       // Keep pool small for containers
    idleTimeoutMillis: 30_000,    // Free idle connections after 30 s
    connectionTimeoutMillis: 10_000,
  });

  // Surface pool-level errors instead of crashing
  pool.on('error', (err) => {
    console.error('🔴 PG Pool error (background):', err.message);
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
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
