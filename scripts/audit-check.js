require('dotenv').config();
const prisma = require('../prisma');

function mask(value) {
  if (!value) return null;
  const str = String(value);
  if (str.length <= 8) return '***';
  return `${str.slice(0, 4)}...${str.slice(-2)}`;
}

async function main() {
  const internships = await prisma.internship.findMany({
    select: { id: true, title: true, price: true },
    orderBy: { title: 'asc' },
  });

  const usersCount = await prisma.user.count();
  const enrollmentsCount = await prisma.userInternship.count();
  const payments = await prisma.payment.findMany({
    select: {
      id: true,
      userId: true,
      internshipId: true,
      razorpayOrderId: true,
      razorpayId: true,
      status: true,
      amount: true,
      currency: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const requiredEnv = ['DATABASE_URL', 'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'FRONTEND_URL'];
  const envSummary = Object.fromEntries(
    requiredEnv.map((key) => [
      key,
      {
        present: Boolean(process.env[key]),
        maskedValue: mask(process.env[key]),
      },
    ])
  );

  const linkedPayments = payments.filter(
    (p) => p.userId && p.internshipId && (p.razorpayOrderId || p.razorpayId)
  ).length;

  const pricingBuckets = internships.reduce(
    (acc, i) => {
      if (i.price === 34900) acc.price349 += 1;
      else if (i.price === 1000) acc.test10 += 1;
      else acc.other += 1;
      return acc;
    },
    { price349: 0, test10: 0, other: 0 }
  );

  const output = {
    envSummary,
    dbSummary: {
      internshipsCount: internships.length,
      usersCount,
      enrollmentsCount,
      pricingBuckets,
      internships,
      recentPayments: payments,
      linkedPayments,
    },
  };

  console.log(JSON.stringify(output, null, 2));
}

main()
  .catch((err) => {
    console.error('AUDIT_CHECK_FAILED', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
