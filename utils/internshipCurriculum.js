const INTERNSHIP_CATALOG = [
  {
    title: 'Test Internship',
    domain: 'Payments',
    duration: '1 Week',
    level: 'Beginner Friendly',
    price: 1000,
    description: 'A safe low-value internship for verifying Razorpay payment flow end to end.',
  },
  {
    title: 'Frontend Developer Internship',
    domain: 'Web Development',
    duration: '4 Weeks',
    level: 'Beginner Friendly',
    price: 34900,
    description: 'Build a polished frontend project with responsive UI, API integration, and deployment.',
  },
  {
    title: 'Full-Stack Developer Internship',
    domain: 'Web Development',
    duration: '4 Weeks',
    level: 'Intermediate',
    price: 34900,
    description: 'Build a complete product with authentication, backend APIs, and frontend flows.',
  },
  {
    title: 'AI Engineer Internship',
    domain: 'AI / ML',
    duration: '4 Weeks',
    level: 'Intermediate',
    price: 34900,
    description: 'Create an AI application with prompt workflows, memory, and deployment.',
  },
  {
    title: 'Data Scientist Internship',
    domain: 'Data Science',
    duration: '4 Weeks',
    level: 'Intermediate',
    price: 34900,
    description: 'Turn raw datasets into predictions, evaluation reports, and deployable insights.',
  },
  {
    title: 'Python Developer Internship',
    domain: 'Python',
    duration: '4 Weeks',
    level: 'Beginner Friendly',
    price: 34900,
    description: 'Automate workflows and build practical Python utilities for real use cases.',
  },
  {
    title: 'UI/UX Designer Internship',
    domain: 'UI/UX',
    duration: '4 Weeks',
    level: 'Beginner Friendly',
    price: 34900,
    description: 'Design user flows, interfaces, and a portfolio-ready case study in Figma.',
  },
  {
    title: 'Flutter Developer Internship',
    domain: 'Android / Flutter',
    duration: '4 Weeks',
    level: 'Intermediate',
    price: 34900,
    description: 'Build a cross-platform mobile app with auth, data, and release flow.',
  },
  {
    title: 'Android Developer Internship',
    domain: 'Android / Flutter',
    duration: '4 Weeks',
    level: 'Beginner Friendly',
    price: 34900,
    description: 'Build a native Android app with media controls, storage, and a production build.',
  },
  {
    title: 'Java Developer Internship',
    domain: 'Java / C++',
    duration: '4 Weeks',
    level: 'Beginner Friendly',
    price: 34900,
    description: 'Strengthen core Java and backend fundamentals with practical builds.',
  },
  {
    title: 'C++ Developer Internship',
    domain: 'Java / C++',
    duration: '4 Weeks',
    level: 'Intermediate',
    price: 34900,
    description: 'Build strong DSA and system programming foundations with interview-style projects.',
  },
  {
    title: 'Machine Learning Engineer Internship',
    domain: 'AI / ML',
    duration: '4 Weeks',
    level: 'Intermediate',
    price: 34900,
    description: 'Build end-to-end ML pipelines from data prep to model deployment.',
  },
  {
    title: 'Backend Developer Internship',
    domain: 'Web Development',
    duration: '4 Weeks',
    level: 'Intermediate',
    price: 34900,
    description: 'Build production backend systems with authentication, payments, and database flows.',
  },
  {
    title: 'Data Analytics Internship',
    domain: 'Data Science',
    duration: '4 Weeks',
    level: 'Beginner Friendly',
    price: 34900,
    description: 'Create dashboards and business-ready insights from real datasets.',
  },
  {
    title: 'Power BI Data Analyst Internship',
    domain: 'Data Science',
    duration: '4 Weeks',
    level: 'Beginner Friendly',
    price: 34900,
    description: 'Learn Power BI by building executive KPI dashboards and DAX measures.',
  },
  {
    title: 'Tableau Visionary Internship',
    domain: 'Data Science',
    duration: '4 Weeks',
    level: 'Beginner Friendly',
    price: 34900,
    description: 'Build business storyboards and interactive visual dashboards in Tableau.',
  },
  {
    title: 'Data Science with Python Internship',
    domain: 'Python',
    duration: '4 Weeks',
    level: 'Intermediate',
    price: 34900,
    description: 'Apply Python data science workflows to build predictive models.',
  },
  {
    title: 'Data Science with R Master Internship',
    domain: 'Data Science',
    duration: '4 Weeks',
    level: 'Intermediate',
    price: 34900,
    description: 'Use R for wrangling, modelling, and forecasting workflows.',
  },
  {
    title: 'Business Analytics with R Internship',
    domain: 'Data Science',
    duration: '4 Weeks',
    level: 'Beginner Friendly',
    price: 34900,
    description: 'Translate business data into decisions using R-based analytics and reporting.',
  },
];

function createTask(week, title, description, resources) {
  return {
    week,
    title,
    description,
    resources,
  };
}

function normalize(value) {
  return String(value || '').toLowerCase();
}

function buildFallbackTasks(internship) {
  const title = normalize(internship.title);
  const domain = normalize(internship.domain);

  if (title.includes('frontend')) {
    return [
      createTask(1, 'UI Foundations', 'Set up the app shell, layout, and responsive styling.', 'Project setup, responsive layout, component patterns'),
      createTask(2, 'Interactive Components', 'Build reusable sections, cards, and user interactions.', 'State handling, accessibility, animation basics'),
      createTask(3, 'API Integration', 'Connect remote data and handle loading and error states.', 'Fetch flow, filters, empty states'),
      createTask(4, 'Launch', 'Polish performance and prepare the project for deployment.', 'Performance checks, deployment guide, portfolio notes'),
    ];
  }

  if (title.includes('full-stack') || title.includes('backend')) {
    return [
      createTask(1, 'Architecture Setup', 'Plan schema, authentication, and route structure.', 'Database schema, auth design, API contracts'),
      createTask(2, 'Core Features', 'Build the main CRUD and workflow endpoints.', 'Validation, role checks, service structure'),
      createTask(3, 'Frontend Flow', 'Wire the frontend experience to backend APIs.', 'Client state, loading handling, responsiveness'),
      createTask(4, 'Production Deploy', 'Ship the app and verify the full end-to-end flow.', 'Deployment, testing, release checklist'),
    ];
  }

  if (title.includes('ai engineer') || title.includes('machine learning engineer') || title.includes('data scientist') || title.includes('data science with python')) {
    return [
      createTask(1, 'Data Preparation', 'Clean datasets and define a reliable input pipeline.', 'Python, pandas, data cleaning, EDA'),
      createTask(2, 'Model Building', 'Create the first predictive or conversational model.', 'Prompting, scikit-learn, model baseline'),
      createTask(3, 'Model Evaluation', 'Measure performance and iterate on the model output.', 'Metrics, error analysis, tuning'),
      createTask(4, 'Deployment', 'Expose the model or AI flow through a simple service.', 'API endpoint, deployment, docs'),
    ];
  }

  if (title.includes('data science with r') || title.includes('business analytics with r')) {
    return [
      createTask(1, 'R Workflow Setup', 'Set up R tools and clean the source data.', 'RStudio, tidyverse, data import'),
      createTask(2, 'Analytics Modeling', 'Build statistical or trend models.', 'Regression, forecasting, validation'),
      createTask(3, 'Visualization', 'Create charts and dashboards that explain the data.', 'ggplot2, storytelling, KPIs'),
      createTask(4, 'Report Delivery', 'Summarize findings for a business audience.', 'Executive summary, insights, presentation'),
    ];
  }

  if (title.includes('power bi')) {
    return [
      createTask(1, 'Data Modeling Basics', 'Import data and define model relationships.', 'Power BI, schema, transformations'),
      createTask(2, 'Dashboard Design', 'Build KPI cards, charts, and filters.', 'Visual layout, slicers, measures'),
      createTask(3, 'DAX Measures', 'Create reusable calculations and business metrics.', 'DAX, time intelligence, validation'),
      createTask(4, 'Publish & Present', 'Share the report and create an executive summary.', 'Publish, permissions, presentation'),
    ];
  }

  if (title.includes('tableau')) {
    return [
      createTask(1, 'Tableau Fundamentals', 'Connect data and build your first visuals.', 'Data connection, chart basics, filters'),
      createTask(2, 'Dashboard Assembly', 'Combine visuals into an interactive dashboard.', 'Actions, dashboard layout, device views'),
      createTask(3, 'Calculated Insights', 'Use calculated fields and parameters for analysis.', 'Parameters, calculations, scenario analysis'),
      createTask(4, 'Business Storytelling', 'Present the data as a business narrative.', 'Storyboard, insights, executive summary'),
    ];
  }

  if (title.includes('python developer')) {
    return [
      createTask(1, 'Python Automation Basics', 'Learn script structure and command-line workflows.', 'CLI input, file I/O, scheduling'),
      createTask(2, 'Easy Project Build', 'Automate file and email tasks with Python.', 'Automation, logging, error handling'),
      createTask(3, 'Medium Project Build', 'Create a command-line utility tool.', 'Argument parsing, secure storage, CRUD'),
      createTask(4, 'Packaging & Delivery', 'Package and document the scripts for delivery.', 'Refactor, tests, README, release'),
    ];
  }

  if (title.includes('ui/ux')) {
    return [
      createTask(1, 'UX Research & Wireframes', 'Define users, flows, and low-fidelity wireframes.', 'Research, journeys, wireframing'),
      createTask(2, 'Easy Project Build', 'Design a polished mobile interface in Figma.', 'Color systems, typography, components'),
      createTask(3, 'Medium Project Build', 'Create a clickable case study prototype.', 'User flows, prototype, usability checks'),
      createTask(4, 'Case Study Delivery', 'Finalize a portfolio-ready case study.', 'Before/after rationale, export assets, portfolio'),
    ];
  }

  if (title.includes('flutter')) {
    return [
      createTask(1, 'App Foundation', 'Set up the app, routing, and layouts.', 'Flutter setup, navigation, state basics'),
      createTask(2, 'Auth & Data', 'Implement authentication and persistent storage.', 'Firebase auth, Firestore, security rules'),
      createTask(3, 'Social Features', 'Build the main interactive product flow.', 'Feed screen, upload, profile, interactions'),
      createTask(4, 'Build & Ship', 'Prepare the release build and final QA.', 'Release config, APK/IPA, test checklist'),
    ];
  }

  if (title.includes('android')) {
    return [
      createTask(1, 'Kotlin + Layouts', 'Set up the app and core screens.', 'Android Studio, layouts, navigation'),
      createTask(2, 'Player System', 'Add media or core interaction controls.', 'MediaPlayer, queue, playback states'),
      createTask(3, 'Data Layer', 'Persist application state and user preferences.', 'Room DB, repository pattern, testing'),
      createTask(4, 'App Release', 'Package and publish the Android build.', 'Build variants, QA, release notes'),
    ];
  }

  if (title.includes('java')) {
    return [
      createTask(1, 'Java Core & OOP', 'Set up Java architecture and object-oriented foundations.', 'Classes, inheritance, interfaces'),
      createTask(2, 'Easy Project Build', 'Build a console-based management system.', 'CRUD flow, validation, exception handling'),
      createTask(3, 'Medium Project Build', 'Build a basic REST API using Spring Boot.', 'Endpoints, DTOs, persistence'),
      createTask(4, 'Testing & Documentation', 'Test the modules and publish documentation.', 'API tests, cleanup, README'),
    ];
  }

  if (title.includes('c++')) {
    return [
      createTask(1, 'STL + Complexity', 'Master STL and time complexity fundamentals.', 'Vectors, maps, sorting, complexity'),
      createTask(2, 'DSA Modules', 'Implement core data structures and algorithms.', 'Trees, graphs, heaps, hashing'),
      createTask(3, 'Interview Drills', 'Solve curated interview-style problems.', 'Arrays, DP, greedy, backtracking'),
      createTask(4, 'Toolkit Finalization', 'Organize reusable interview toolkit assets.', 'Refactor, comments, README, submission'),
    ];
  }

  if (domain.includes('data science')) {
    return [
      createTask(1, 'Data Preparation', 'Clean and structure the dataset for analysis.', 'EDA, missing values, feature prep'),
      createTask(2, 'Dashboard Design', 'Create a compact KPI dashboard.', 'Charts, slicers, layout, formatting'),
      createTask(3, 'Insights', 'Turn patterns into actionable findings.', 'Metrics, comparisons, analysis notes'),
      createTask(4, 'Report Delivery', 'Present the analysis with a clear summary.', 'Recommendations, presentation, export'),
    ];
  }

  if (domain.includes('web development')) {
    return [
      createTask(1, 'Project Foundations', 'Set up the codebase, routing, and structure.', 'Setup, components, layout'),
      createTask(2, 'Feature Build', 'Implement the main product interactions.', 'UI sections, forms, state'),
      createTask(3, 'API Integration', 'Connect data sources and handle loading states.', 'Fetch, error handling, filters'),
      createTask(4, 'Launch', 'Deploy and polish the final product.', 'Performance, QA, deployment'),
    ];
  }

  return [
    createTask(1, 'Project Setup', 'Define the scope and build the foundation.', 'Setup, planning, structure'),
    createTask(2, 'Core Build', 'Work on the main features and interactions.', 'Components, state, logic'),
    createTask(3, 'Validation', 'Review quality and fix issues.', 'Testing, debugging, refinement'),
    createTask(4, 'Delivery', 'Prepare the final project and submission assets.', 'Documentation, deployment, presentation'),
  ];
}

const buildCurriculumTasks = buildFallbackTasks;

function groupTasksByWeek(tasks) {
  const orderedWeeks = [...new Set(tasks.map((task) => task.week))].sort((a, b) => a - b);

  return orderedWeeks.map((week) => {
    const weekTasks = tasks.filter((task) => task.week === week);
    const resources = [...new Set(weekTasks.flatMap((task) => {
      if (!task.resources) return [];
      return String(task.resources).split(',').map((item) => item.trim()).filter(Boolean);
    }))];

    return {
      week,
      title: `Week ${week}`,
      description: weekTasks[0]?.description || 'Guided learning module',
      resources,
      tasks: weekTasks.map((task, index) => ({
        id: task.id || `${week}-${index}`,
        title: task.title,
        description: task.description,
      })),
    };
  });
}

module.exports = {
  INTERNSHIP_CATALOG,
  buildCurriculumTasks,
  groupTasksByWeek,
};