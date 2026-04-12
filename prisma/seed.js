require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient({
  adapter: new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })),
});

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.payment.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.userInternship.deleteMany();
  await prisma.task.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.internship.deleteMany();
  await prisma.user.deleteMany();

  // NOTE: These are development-only credentials. Rotate in production.
  const hashedPassword = await bcrypt.hash('password123', 12);
  const testUser = await prisma.user.create({
    data: {
      name: 'Aarav Sharma',
      email: 'test@skillo.in',
      password: hashedPassword,
      college: 'IIT Delhi',
      year: '2',
      role: 'USER',
    },
  });
  console.log('✅ Created test user:', testUser.email);

  // Create admin user
  const adminHashedPassword = await bcrypt.hash('admin123', 12);
  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@mohit.in',
      password: adminHashedPassword,
      role: 'ADMIN',
    },
  });
  console.log('✅ Created admin user:', adminUser.email);

  // Create internships
  const digitalMarketing = await prisma.internship.create({
    data: {
      title: 'Digital Marketing',
      domain: 'Marketing',
      duration: '2 Weeks',
      level: 'Beginner Friendly',
      price: 9900, // 99.00 INR
      description: 'Execute practical marketing workflows by researching, building, and analyzing a complete digital campaign.',
    },
  });

  const webDev = await prisma.internship.create({
    data: {
      title: 'Web Development',
      domain: 'Engineering',
      duration: '2 Weeks',
      level: 'Beginner Friendly',
      price: 19900, // 199.00 INR
      description: 'Start with core web fundamentals and complete guided deployment tasks mirroring real industry workflows.',
    },
  });

  const dataAnalytics = await prisma.internship.create({
    data: {
      title: 'Data Analytics',
      domain: 'Analytics',
      duration: '2 Weeks',
      level: 'Beginner Friendly',
      price: 19900, // 199.00 INR
      description: 'Process raw datasets and develop clear corporate visualization dashboards to extract business value.',
    },
  });

  const aiMl = await prisma.internship.create({
    data: {
      title: 'AI & Machine Learning',
      domain: 'Engineering',
      duration: '4 Weeks',
      level: 'Beginner Friendly',
      price: 29900, // 299.00 INR
      description: 'Learn machine learning fundamentals through guided practical implementation. From data cleaning to model deployment.',
    },
  });

  const testInternship = await prisma.internship.create({
    data: {
      title: 'Test Internship',
      domain: 'Payments',
      duration: '1 Week',
      level: 'Beginner Friendly',
      price: 1000, // 10.00 INR
      description: 'A safe low-value internship for verifying Razorpay payment flow end to end.',
    },
  });

  console.log('✅ Created 5 internships');

  // Create tasks for Digital Marketing
  const dmTasks = await Promise.all([
    prisma.task.create({
      data: {
        internshipId: digitalMarketing.id,
        title: 'Social Media Campaign Brief',
        description: 'Research competitor brands and draft a structured campaign strategy brief covering audience, tone, and content pillars.',
        week: 1,
        resources: 'Strategy brief template, Competitor analysis guide',
      },
    }),
    prisma.task.create({
      data: {
        internshipId: digitalMarketing.id,
        title: 'Marketing Asset Design',
        description: 'Create platform-optimized social media assets based on the approved campaign brief.',
        week: 1,
        resources: 'Platform dimension specs, Brand guidelines',
      },
    }),
    prisma.task.create({
      data: {
        internshipId: digitalMarketing.id,
        title: 'SEO Content Writing',
        description: 'Draft a 500-word SEO-optimized article aligned with the campaign strategy.',
        week: 1,
        resources: 'SEO content guidelines, Keyword research tools',
      },
    }),
    prisma.task.create({
      data: {
        internshipId: digitalMarketing.id,
        title: 'Performance Data Analysis',
        description: 'Process raw campaign metrics to extract actionable insights and calculate ROI.',
        week: 2,
        resources: 'Sample analytics dataset, KPI reference sheet',
      },
    }),
    prisma.task.create({
      data: {
        internshipId: digitalMarketing.id,
        title: 'Post-Campaign Presentation',
        description: 'Synthesize all campaign deliverables into a final stakeholder presentation.',
        week: 2,
        resources: 'Presentation template',
      },
    }),
  ]);

  // Create tasks for Web Development
  await Promise.all([
    prisma.task.create({
      data: {
        internshipId: webDev.id,
        title: 'Build a Responsive Landing Page',
        description: 'Create a modern, responsive landing page using semantic HTML, CSS, and basic JavaScript.',
        week: 1,
        resources: 'CSS responsive design guidelines',
      },
    }),
    prisma.task.create({
      data: {
        internshipId: webDev.id,
        title: 'Deploy Your Website',
        description: 'Deploy your web application live using Vercel or Netlify.',
        week: 1,
        resources: 'Deployment documentation',
      },
    }),
    prisma.task.create({
      data: {
        internshipId: webDev.id,
        title: 'Technical Project Summary',
        description: 'Draft a concise project summary suitable for your resume and portfolio.',
        week: 2,
        resources: 'Technical writing guidelines',
      },
    }),
  ]);

  // Create tasks for Data Analytics
  await Promise.all([
    prisma.task.create({
      data: {
        internshipId: dataAnalytics.id,
        title: 'Exploratory Data Analysis',
        description: 'Process provided dataset to perform exploratory analysis and uncover structural trends.',
        week: 1,
        resources: 'Statistical analysis foundations',
      },
    }),
    prisma.task.create({
      data: {
        internshipId: dataAnalytics.id,
        title: 'Build a Dashboard',
        description: 'Design an interactive visualization dashboard summarizing key metrics.',
        week: 1,
        resources: 'Data visualization best practices',
      },
    }),
    prisma.task.create({
      data: {
        internshipId: dataAnalytics.id,
        title: 'Executive Insights Report',
        description: 'Translate analytical findings into a non-technical executive summary.',
        week: 2,
        resources: 'Executive communication guidelines',
      },
    }),
  ]);

  // Create tasks for AI/ML
  await Promise.all([
    prisma.task.create({
      data: {
        internshipId: aiMl.id,
        title: 'Data Exploration & Cleaning',
        description: 'Load a real dataset, explore patterns, and clean messy data using Python and Pandas.',
        week: 1,
        resources: 'Pandas documentation, Sample notebook',
      },
    }),
    prisma.task.create({
      data: {
        internshipId: aiMl.id,
        title: 'Build a Prediction Model',
        description: 'Train a simple ML model to predict outcomes from your cleaned data.',
        week: 2,
        resources: 'Scikit-learn fundamentals',
      },
    }),
    prisma.task.create({
      data: {
        internshipId: aiMl.id,
        title: 'Model Evaluation Report',
        description: 'Write an evaluation report with visualizations comparing model performance.',
        week: 3,
        resources: 'Matplotlib guidelines',
      },
    }),
    prisma.task.create({
      data: {
        internshipId: aiMl.id,
        title: 'Deploy a Basic API',
        description: 'Wrap your trained model into a simple Flask/FastAPI endpoint that accepts input and returns predictions.',
        week: 4,
        resources: 'FastAPI documentation',
      },
    }),
  ]);

  await Promise.all([
    prisma.task.create({
      data: {
        internshipId: testInternship.id,
        title: 'Payment Verification Check',
        description: 'Complete a safe Razorpay payment to verify order creation, signature validation, and enrollment access.',
        week: 1,
        resources: 'Razorpay test card details, payment verification checklist',
      },
    }),
  ]);

  console.log('✅ Created tasks for all internships');

  // Enroll test user in Digital Marketing
  await prisma.userInternship.create({
    data: {
      userId: testUser.id,
      internshipId: digitalMarketing.id,
      status: 'IN_PROGRESS',
      progress: 40,
    },
  });
  console.log('✅ Enrolled test user in Digital Marketing');

  // Create sample submissions (2 approved, 1 submitted)
  await prisma.submission.create({
    data: {
      userId: testUser.id,
      taskId: dmTasks[0].id,
      githubLink: 'https://drive.google.com/file/d/campaign-brief',
      status: 'APPROVED',
      feedback: 'Excellent research and well-structured brief. Great competitive analysis.',
    },
  });

  await prisma.submission.create({
    data: {
      userId: testUser.id,
      taskId: dmTasks[1].id,
      githubLink: 'https://drive.google.com/file/d/marketing-assets',
      status: 'APPROVED',
      feedback: 'Clean designs with strong brand consistency. Good work.',
    },
  });

  await prisma.submission.create({
    data: {
      userId: testUser.id,
      taskId: dmTasks[2].id,
      githubLink: 'https://docs.google.com/document/d/seo-article',
      status: 'SUBMITTED',
    },
  });

  console.log('✅ Created sample submissions');
  console.log('\n🎉 Seed complete!');
  console.log('📧 Test login: test@skillo.in / password123');
  console.log('📧 Admin login: admin@mohit.in / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
