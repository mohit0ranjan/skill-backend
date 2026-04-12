const bcrypt = require('bcrypt');
const crypto = require('crypto');

/**
 * DEV FALLBACK SYSTEM — DEVELOPMENT ONLY
 * This entire module is gated behind NODE_ENV === 'development'.
 * In production/staging, all fallback functions return null/false.
 */
const IS_DEV = process.env.NODE_ENV === 'development';

if (IS_DEV) {
  console.warn('⚠️  [SECURITY] Dev fallback system is ACTIVE. This must NEVER run in production.');
}

// Use a random password for dev users each startup — never use a known password
const devPasswordHash = IS_DEV ? bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), 12) : '';

const fallbackUsers = IS_DEV ? [
  Object.freeze({
    id: 'dev-user-1',
    name: 'Aarav Sharma',
    email: 'test@skillo.in',
    password: devPasswordHash,
    college: 'IIT Delhi',
    year: '2',
    role: 'USER',
    emailVerified: true,
  }),
  Object.freeze({
    id: 'dev-admin-1',
    name: 'Admin',
    email: 'admin@skillo.in',
    password: devPasswordHash,
    college: null,
    year: null,
    role: 'ADMIN',
    emailVerified: true,
  }),
] : Object.freeze([]);

const fallbackInternships = [
  {
    id: 'dev-internship-dm',
    title: 'Digital Marketing',
    domain: 'Marketing',
    duration: '2 Weeks',
    level: 'Beginner Friendly',
    price: 99,
    description: 'Execute practical marketing workflows by researching, building, and analyzing a complete digital campaign.',
    tasks: [
      {
        id: 'dev-task-dm-1',
        internshipId: 'dev-internship-dm',
        title: 'Social Media Campaign Brief',
        description: 'Research competitor brands and draft a structured campaign strategy brief covering audience, tone, and content pillars.',
        week: 1,
        resources: 'Strategy brief template, Competitor analysis guide',
      },
      {
        id: 'dev-task-dm-2',
        internshipId: 'dev-internship-dm',
        title: 'Marketing Asset Design',
        description: 'Create platform-optimized social media assets based on the approved campaign brief.',
        week: 1,
        resources: 'Platform dimension specs, Brand guidelines',
      },
      {
        id: 'dev-task-dm-3',
        internshipId: 'dev-internship-dm',
        title: 'SEO Content Writing',
        description: 'Draft a 500-word SEO-optimized article aligned with the campaign strategy.',
        week: 1,
        resources: 'SEO content guidelines, Keyword research tools',
      },
      {
        id: 'dev-task-dm-4',
        internshipId: 'dev-internship-dm',
        title: 'Performance Data Analysis',
        description: 'Process raw campaign metrics to extract actionable insights and calculate ROI.',
        week: 2,
        resources: 'Sample analytics dataset, KPI reference sheet',
      },
      {
        id: 'dev-task-dm-5',
        internshipId: 'dev-internship-dm',
        title: 'Post-Campaign Presentation',
        description: 'Synthesize all campaign deliverables into a final stakeholder presentation.',
        week: 2,
        resources: 'Presentation template',
      },
    ],
  },
  {
    id: 'dev-internship-web',
    title: 'Web Development',
    domain: 'Engineering',
    duration: '2 Weeks',
    level: 'Beginner Friendly',
    price: 199,
    description: 'Start with core web fundamentals and complete guided deployment tasks mirroring real industry workflows.',
    tasks: [],
  },
  {
    id: 'dev-internship-data',
    title: 'Data Analytics',
    domain: 'Analytics',
    duration: '2 Weeks',
    level: 'Beginner Friendly',
    price: 199,
    description: 'Process raw datasets and develop clear corporate visualization dashboards to extract business value.',
    tasks: [],
  },
  {
    id: 'dev-internship-ai',
    title: 'AI & Machine Learning',
    domain: 'Engineering',
    duration: '4 Weeks',
    level: 'Beginner Friendly',
    price: 299,
    description: 'Learn machine learning fundamentals through guided practical implementation. From data cleaning to model deployment.',
    tasks: [],
  },
];

const fallbackEnrollments = {
  'dev-user-1': [
    {
      id: 'dev-enrollment-1',
      internshipId: 'dev-internship-dm',
      internship: fallbackInternships[0],
      status: 'IN_PROGRESS',
      progress: 40,
      completedWeeks: 1,
      enrolledAt: '2026-04-01T00:00:00.000Z',
    },
  ],
  'dev-admin-1': [],
};

const fallbackSubmissions = [
  {
    id: 'dev-submission-1',
    userId: 'dev-user-1',
    internshipId: 'dev-internship-dm',
    projectTitle: 'Social Media Campaign Brief',
    projectLink: 'https://drive.google.com/file/d/campaign-brief',
    description: 'Competitor research and brief.',
    fileUrl: null,
    status: 'APPROVED',
    feedback: 'Excellent research and well-structured brief. Great competitive analysis.',
    submittedAt: '2026-04-03T10:00:00.000Z',
    updatedAt: '2026-04-03T12:00:00.000Z',
  },
  {
    id: 'dev-submission-2',
    userId: 'dev-user-1',
    internshipId: 'dev-internship-dm',
    projectTitle: 'Marketing Asset Design',
    projectLink: 'https://drive.google.com/file/d/marketing-assets',
    description: 'Campaign assets.',
    fileUrl: null,
    status: 'APPROVED',
    feedback: 'Clean designs with strong brand consistency. Good work.',
    submittedAt: '2026-04-04T10:00:00.000Z',
    updatedAt: '2026-04-04T12:00:00.000Z',
  },
  {
    id: 'dev-submission-3',
    userId: 'dev-user-1',
    internshipId: 'dev-internship-dm',
    projectTitle: 'SEO Content Writing',
    projectLink: 'https://docs.google.com/document/d/seo-article',
    description: 'SEO article draft.',
    fileUrl: null,
    status: 'SUBMITTED',
    feedback: null,
    submittedAt: '2026-04-05T10:00:00.000Z',
    updatedAt: '2026-04-05T12:00:00.000Z',
  },
];

function isDatabaseUnavailableError(error) {
  const message = `${error?.message || ''} ${error?.code || ''}`.toLowerCase();
  return (
    error?.code === 'ECONNREFUSED' ||
    error?.code === 'P1001' ||
    error?.code === 'P1002' ||
    error?.code === 'P1008' ||
    error?.code === 'P1017' ||
    message.includes('connection refused') ||
    message.includes('database server') ||
    message.includes('timed out')
  );
}

function getFallbackUserByEmail(email) {
  return fallbackUsers.find((user) => user.email === email.toLowerCase()) || null;
}

function getFallbackUserById(userId) {
  return fallbackUsers.find((user) => user.id === userId) || null;
}

function buildWeekGroups(tasks) {
  const orderedWeeks = [...new Set(tasks.map((task) => task.week))].sort((left, right) => left - right);

  return orderedWeeks.map((week) => {
    const weekTasks = tasks.filter((task) => task.week === week);
    const resources = [...new Set(weekTasks.flatMap((task) => {
      if (!task.resources) return [];
      return task.resources.split(',').map((item) => item.trim()).filter(Boolean);
    }))];

    return {
      week,
      title: `Week ${week}`,
      description: weekTasks[0]?.description || 'Guided learning module',
      resources,
      tasks: weekTasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
      })),
    };
  });
}

function buildFallbackDashboard(userId) {
  const user = getFallbackUserById(userId) || fallbackUsers[0];
  const enrollments = fallbackEnrollments[user.id] || [];
  const finalSubmissions = fallbackSubmissions.filter((submission) => submission.userId === user.id);
  const recentActivity = [
    ...finalSubmissions.map((submission) => ({
      text: `Final project submitted: ${submission.projectTitle}`,
      time: submission.updatedAt,
      status: submission.status,
    })),
  ]
    .sort((left, right) => new Date(right.time) - new Date(left.time))
    .slice(0, 5);

  const mappedEnrollments = enrollments.map((enrollment) => {
    const internship = enrollment.internship;
    const weeks = buildWeekGroups(internship.tasks || []);
    const totalWeeks = weeks.length;
    const submission = finalSubmissions.find((item) => item.internshipId === enrollment.internshipId) || null;
    const progress = submission
      ? 100
      : totalWeeks === 0
        ? 0
        : Math.min(99, Math.round((enrollment.completedWeeks / totalWeeks) * 100));

    return {
      id: enrollment.id,
      internshipId: enrollment.internshipId,
      internship: internship.title,
      domain: internship.domain,
      duration: internship.duration,
      status: enrollment.status,
      progress,
      totalWeeks,
      completedWeeks: enrollment.completedWeeks,
      tasksSummary: {
        total: totalWeeks,
        submitted: submission ? 1 : 0,
        approved: submission ? 1 : 0,
      },
      tasks: (internship.tasks || []).map((task) => ({
        id: task.id,
        title: task.title,
        week: task.week,
        status: 'pending',
        submissionStatus: null,
        feedback: null,
      })),
      weeks,
      finalSubmission: submission ? {
        id: submission.id,
        projectTitle: submission.projectTitle,
        projectLink: submission.projectLink,
        description: submission.description,
        fileUrl: submission.fileUrl,
        status: submission.status,
        submittedAt: submission.submittedAt,
      } : null,
      certificate: null,
      enrolledAt: enrollment.enrolledAt,
    };
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    enrollments: mappedEnrollments,
    stats: {
      totalEnrollments: mappedEnrollments.length,
      totalTasks: mappedEnrollments.reduce((sum, item) => sum + item.tasksSummary.total, 0),
      completedTasks: mappedEnrollments.reduce((sum, item) => sum + (item.finalSubmission ? 1 : 0), 0),
      certificates: 0,
    },
    recentActivity,
  };
}

function getFallbackInternships() {
  return fallbackInternships.map((internship) => ({
    ...internship,
    requiresPayment: (internship.price || 0) > 0,
  }));
}

function getFallbackInternshipById(id) {
  const internship = fallbackInternships.find((item) => item.id === id);
  if (!internship) return null;

  return {
    ...internship,
    requiresPayment: (internship.price || 0) > 0,
  };
}

module.exports = {
  isDatabaseUnavailableError,
  getFallbackUserByEmail,
  getFallbackUserById,
  buildFallbackDashboard,
  getFallbackInternships,
  getFallbackInternshipById,
  fallbackUsers,
  fallbackInternships,
  fallbackSubmissions,
};