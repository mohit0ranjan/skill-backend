const prisma = require('../prisma');
const emailServiceModule = require('../services/email.service');
const emailService = emailServiceModule.emailService || emailServiceModule;
const { ApiResponse, ApiError } = require('../utils/apiResponse');
const { isDatabaseUnavailableError, buildFallbackDashboard } = require('../utils/devFallback');
const { buildCurriculumTasks, groupTasksByWeek } = require('../utils/internshipCurriculum');

/**
 * Enroll user in internship
 * Validates: internship exists, user not already enrolled
 * Sends confirmation email (non-blocking)
 */
const enroll = async (req, res, next) => {
  try {
    const { internshipId } = req.validatedBody;
    const userId = req.user.id;

    // Check internship exists
    const internship = await prisma.internship.findUnique({
      where: { id: internshipId }
    });

    if (!internship) {
      return next(new ApiError('Internship not found', 404, 'INTERNSHIP_NOT_FOUND'));
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.userInternship.findUnique({
      where: { userId_internshipId: { userId, internshipId } }
    });

    if (existingEnrollment) {
      return next(new ApiError('You are already enrolled in this internship', 400, 'ALREADY_ENROLLED'));
    }

    if ((internship.price || 0) > 0) {
      return next(new ApiError('Payment required before enrollment', 402, 'PAYMENT_REQUIRED', {
        internshipId: internship.id,
        amount: internship.price,
        currency: 'INR'
      }));
    }

    // Create enrollment
    const enrollment = await prisma.userInternship.create({
      data: {
        userId,
        internshipId,
        status: 'STARTED',
        progress: 0
      }
    });

    // Get user details for email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    });

    // Send enrollment confirmation email (non-blocking)
    if (user) {
      emailService.sendEnrollmentConfirmation({
        userEmail: user.email,
        userName: user.name,
        internshipTitle: internship.title,
        internshipDuration: internship.duration || '12 weeks'
      }).catch(err => console.error('Enrollment email failed:', err.message));
    }

    res.json(ApiResponse.success(
      {
        enrollmentId: enrollment.id,
        internship: {
          id: internship.id,
          title: internship.title,
          domain: internship.domain,
            duration: internship.duration,
            price: internship.price,
            requiresPayment: (internship.price || 0) > 0
        }
      },
      'Enrolled successfully! Check your email for details.',
      201
    ));
  } catch (error) {
    next(new ApiError(`Enrollment failed: ${error.message}`, 500, 'ENROLLMENT_FAILED'));
  }
};


/**
 * Get user dashboard with enrollments, tasks, and progress
 */
const getDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [user, userInternships, finalSubmissions, certificates] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, role: true, college: true, year: true }
      }),
      prisma.userInternship.findMany({
        where: { userId },
        include: {
          internship: {
            include: { tasks: true }
          }
        }
      }),
      prisma.finalProjectSubmission.findMany({
        where: { userId }
      }),
      prisma.certificate.findMany({
        where: { userId }
      })
    ]);

    if (!user) {
      return next(new ApiError('User not found', 404, 'USER_NOT_FOUND'));
    }

    // Process enrollments with progress
    const enrollments = userInternships.map(ui => {
      const sourceTasks = ui.internship.tasks.length > 0 ? ui.internship.tasks : buildCurriculumTasks(ui.internship);
      const weeks = groupTasksByWeek(sourceTasks);
      const totalWeeks = weeks.length;
      const submission = finalSubmissions.find(sub => sub.internshipId === ui.internshipId) || null;
      const progress = submission
        ? 100
        : totalWeeks === 0
          ? 0
          : Math.min(99, Math.round((ui.completedWeeks / totalWeeks) * 100));
      const certificate = certificates.find(c => c.internshipId === ui.internshipId);

      return {
        id: ui.id,
        internshipId: ui.internshipId,
        internship: ui.internship.title,
        domain: ui.internship.domain,
        duration: ui.internship.duration,
        status: ui.status,
        progress,
        totalWeeks,
        completedWeeks: ui.completedWeeks,
        tasksSummary: {
          total: totalWeeks,
          submitted: submission ? 1 : 0,
          approved: submission ? 1 : 0
        },
        tasks: sourceTasks.map((task, index) => ({
          id: task.id || `${ui.internshipId}-task-${index + 1}`,
          title: task.title,
          week: task.week,
          status: 'pending',
          submissionStatus: null,
          feedback: null
        })),
        weeks,
        finalSubmission: submission ? {
          id: submission.id,
          projectTitle: submission.projectTitle,
          projectLink: submission.projectLink,
          description: submission.description,
          fileUrl: submission.fileUrl,
          status: submission.status,
          submittedAt: submission.submittedAt
        } : null,
        certificate: certificate ? {
          id: certificate.id,
          certificateId: certificate.certificateId,
          isPaid: certificate.isPaid,
          issuedDate: certificate.issuedDate
        } : null,
        enrolledAt: ui.createdAt
      };
    });

    const recentFinalActivity = finalSubmissions.map((submission) => ({
      text: `Final project submitted: ${submission.projectTitle}`,
      time: submission.updatedAt,
      status: submission.status
    }));

    const recentCertificateActivity = certificates.map((certificate) => ({
      text: `Certificate issued: ${certificate.certificateId}`,
      time: certificate.issuedDate,
      status: 'APPROVED'
    }));

    const combinedActivity = [...recentFinalActivity, ...recentCertificateActivity]
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 5);

    res.json(ApiResponse.success(
      {
        user,
        enrollments,
        stats: {
          totalEnrollments: enrollments.length,
          totalTasks: enrollments.reduce((sum, e) => sum + e.tasksSummary.total, 0),
          completedTasks: enrollments.reduce((sum, e) => sum + (e.finalSubmission ? 1 : 0), 0),
          certificates: certificates.filter(c => c.isPaid).length
        },
        recentActivity: combinedActivity
      },
      'Dashboard data retrieved successfully',
      200
    ));
  } catch (error) {
    if (isDatabaseUnavailableError(error) && process.env.NODE_ENV !== 'production') {
      const fallbackDashboard = buildFallbackDashboard(req.user.id);
      return res.json(ApiResponse.success(
        fallbackDashboard,
        'Dashboard data retrieved successfully',
        200
      ));
    }

    next(new ApiError(`Dashboard retrieval failed: ${error.message}`, 500, 'DASHBOARD_FAILED'));
  }
};

const getMyInternships = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const enrollments = await prisma.userInternship.findMany({
      where: { userId },
      include: {
        internship: {
          select: {
            id: true,
            title: true,
            domain: true,
            duration: true,
            level: true,
            price: true,
            description: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const data = enrollments.map((entry) => ({
      enrollmentId: entry.id,
      status: entry.status,
      progress: entry.progress,
      completedWeeks: entry.completedWeeks,
      enrolledAt: entry.createdAt,
      internship: entry.internship,
    }));

    res.json(ApiResponse.success(data, 'User internships retrieved successfully', 200));
  } catch (error) {
    next(new ApiError(`Failed to fetch user internships: ${error.message}`, 500, 'MY_INTERNSHIPS_FAILED'));
  }
};

module.exports = { enroll, getDashboard, getMyInternships };
