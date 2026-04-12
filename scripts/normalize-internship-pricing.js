require('dotenv').config();
const prisma = require('../prisma');

async function main() {
  const internships = await prisma.internship.findMany({
    select: { id: true, title: true, price: true },
    orderBy: { title: 'asc' },
  });

  let updated = 0;
  for (const internship of internships) {
    const expectedPrice = internship.title.toLowerCase() === 'test internship' ? 1000 : 34900;
    if (internship.price !== expectedPrice) {
      await prisma.internship.update({
        where: { id: internship.id },
        data: { price: expectedPrice },
      });
      updated += 1;
    }
  }

  console.log(JSON.stringify({ total: internships.length, updated }, null, 2));
}

main()
  .catch((err) => {
    console.error('NORMALIZE_PRICING_FAILED', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
