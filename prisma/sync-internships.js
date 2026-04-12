require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { INTERNSHIP_CATALOG, buildCurriculumTasks } = require('../utils/internshipCurriculum');

const prisma = new PrismaClient({
  adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })),
});

async function main() {
  console.log('Syncing internship catalog and learning plans...');

  for (const item of INTERNSHIP_CATALOG) {
    const existing = await prisma.internship.findFirst({
      where: { title: { equals: item.title, mode: 'insensitive' } },
    });

    const internship = existing
      ? await prisma.internship.update({
          where: { id: existing.id },
          data: {
            domain: item.domain,
            duration: item.duration,
            level: item.level,
            price: item.price,
            description: item.description,
          },
        })
      : await prisma.internship.create({
          data: {
            title: item.title,
            domain: item.domain,
            duration: item.duration,
            level: item.level,
            price: item.price,
            description: item.description,
          },
        });

    const taskCount = await prisma.task.count({ where: { internshipId: internship.id } });

    if (taskCount === 0) {
      const tasks = buildCurriculumTasks(internship);

      await prisma.task.createMany({
        data: tasks.map((task) => ({
          internshipId: internship.id,
          title: task.title,
          description: task.description,
          week: task.week,
          resources: task.resources || null,
        })),
      });

      console.log(`Created curriculum for ${internship.title}`);
    } else {
      console.log(`Updated ${internship.title} (existing tasks: ${taskCount})`);
    }
  }

  console.log('Sync complete.');
}

main()
  .catch((error) => {
    console.error('Sync failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });