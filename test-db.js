const prisma = require('./prisma');
async function main() {
  try {
    await prisma.$queryRawUnsafe('SELECT 1 as ok');
    console.log('DB connection: OK');
  } catch (e) {
    console.error('DB connection: FAILED -', e.message);
    process.exit(1);
  }
  process.exit(0);
}
main();
