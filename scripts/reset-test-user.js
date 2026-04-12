require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const prisma = new PrismaClient({
  adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })),
});

async function resetTestUser() {
  try {
    console.log('🔄 Resetting test user purchases...');

    // Get test user
    const testUser = await prisma.user.findUnique({
      where: { email: 'test@skillo.in' },
    });

    if (!testUser) {
      console.log('❌ Test user not found');
      process.exit(1);
    }

    // Get test internship
    const testInternship = await prisma.internship.findFirst({
      where: { title: 'Test Internship' },
    });

    if (!testInternship) {
      console.log('❌ Test internship not found');
      process.exit(1);
    }

    // Delete payments for test user on test internship
    const paymentsDeleted = await prisma.payment.deleteMany({
      where: {
        userId: testUser.id,
        internshipId: testInternship.id,
      },
    });
    console.log(`✅ Deleted ${paymentsDeleted.count} payments`);

    // Delete certificates for test user on test internship
    const certsDeleted = await prisma.certificate.deleteMany({
      where: {
        userId: testUser.id,
        internshipId: testInternship.id,
      },
    });
    console.log(`✅ Deleted ${certsDeleted.count} certificates`);

    // Delete userInternship enrollment for test user on test internship
    const enrollDeleted = await prisma.userInternship.deleteMany({
      where: {
        userId: testUser.id,
        internshipId: testInternship.id,
      },
    });
    console.log(`✅ Deleted ${enrollDeleted.count} enrollments`);

    console.log('\n🎉 Test user reset complete!');
    console.log(`Test user: ${testUser.email}`);
    console.log(`Test internship: ${testInternship.title} (₹${(testInternship.price / 100).toFixed(2)})`);
    console.log('\nYou can now purchase the ₹10 internship fresh!');
  } catch (error) {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetTestUser();
