require('dotenv').config();
const prisma = require('../prisma');

async function main() {
  const candidates = await prisma.payment.findMany({
    where: {
      internshipId: null,
      status: 'SUCCESS',
      certificateId: { not: null },
    },
    include: {
      certificate: {
        select: { internshipId: true },
      },
    },
  });

  let updated = 0;
  for (const payment of candidates) {
    const internshipId = payment.certificate?.internshipId || null;
    if (!internshipId) continue;

    await prisma.payment.update({
      where: { id: payment.id },
      data: { internshipId },
    });
    updated += 1;
  }

  const remainingUnlinked = await prisma.payment.count({
    where: {
      internshipId: null,
      status: 'SUCCESS',
    },
  });

  console.log(JSON.stringify({ candidates: candidates.length, updated, remainingUnlinked }, null, 2));
}

main()
  .catch((err) => {
    console.error('RECONCILE_PAYMENT_LINKS_FAILED', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
