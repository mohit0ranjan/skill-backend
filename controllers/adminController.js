const prisma = require('../prisma');
const { ApiResponse, ApiError } = require('../utils/apiResponse');
const { createOrReturnCertificate } = require('./learningController');

/**
 * Get all submissions pending review (admin only)
 */
const getPendingSubmissions = async (req, res, next) => {
  try {
    const { internshipId, status = 'SUBMITTED' } = req.query;
    const where = {};

    if (internshipId) {
      where.internshipId = internshipId;
    }

    if (status) {
      where.status = status;
    }

    const submissions = await prisma.finalProjectSubmission.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, college: true } },
        internship: { select: { id: true, title: true, domain: true } }
      },
      orderBy: { submittedAt: 'desc' }
    });

    res.json(ApiResponse.success(
      submissions,
      'Pending submissions retrieved successfully',
      200
    ));
  } catch (error) {
    next(new ApiError(`Failed to fetch submissions: ${error.message}`, 500, 'FETCH_FAILED'));
  }
};

/**
 * Get user details with enrollments and submissions (admin only)
 */
const getUserDetails = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        college: true,
        year: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        // NOTE: password is intentionally excluded — never expose hashes
        internships: {
          include: {
            internship: { select: { id: true, title: true, domain: true } }
          }
        },
        submissions: {
          include: {
            task: { select: { id: true, title: true } }
          }
        },
        finalSubmissions: {
          include: {
            internship: { select: { id: true, title: true, domain: true } }
          }
        },
        certificates: {
          include: {
            internship: { select: { title: true } }
          }
        },
        payments: true
      }
    });

    if (!user) {
      return next(new ApiError('User not found', 404, 'USER_NOT_FOUND'));
    }

    res.json(ApiResponse.success(
      user,
      'User details retrieved successfully',
      200
    ));
  } catch (error) {
    next(new ApiError(`Failed to fetch user: ${error.message}`, 500, 'FETCH_FAILED'));
  }
};

/**
 * Update user role (admin only)
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.validatedBody;

    // Prevent self-role-change
    if (userId === req.user.id && role !== req.user.role) {
      return next(new ApiError('Cannot change your own role', 403, 'FORBIDDEN'));
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role }
    });

    res.json(ApiResponse.success(
      { user },
      `User role updated to ${role}`,
      200
    ));
  } catch (error) {
    if (error.code === 'P2025') {
      return next(new ApiError('User not found', 404, 'USER_NOT_FOUND'));
    }
    next(new ApiError(`Failed to update user: ${error.message}`, 500, 'UPDATE_FAILED'));
  }
};

/**
 * Get internship analytics (admin only)
 */
const getInternshipAnalytics = async (req, res, next) => {
  try {
    const { internshipId } = req.params;

    const internship = await prisma.internship.findUnique({
      where: { id: internshipId },
      include: { tasks: true }
    });

    if (!internship) {
      return next(new ApiError('Internship not found', 404, 'INTERNSHIP_NOT_FOUND'));
    }

    // Unblock the event loop by running aggregate analytics concurrently
    const [enrollments, submissions, certificatesGenerated, certificatesPaid, payments] = await Promise.all([
      prisma.userInternship.count({ where: { internshipId } }),
      prisma.submission.groupBy({
        by: ['status'],
        where: { task: { internshipId } },
        _count: true
      }),
      prisma.certificate.count({ where: { internshipId } }),
      prisma.certificate.count({ where: { internshipId, isPaid: true } }),
      prisma.payment.aggregate({
        where: { internshipId, status: 'SUCCESS' },
        _sum: { amount: true }
      })
    ]);

    const submissionStats = {
      total: submissions.reduce((sum, s) => sum + s._count, 0),
      byStatus: submissions.reduce((acc, s) => {
        acc[s.status] = s._count;
        return acc;
      }, {})
    };

    res.json(ApiResponse.success(
      {
        internship: {
          id: internship.id,
          title: internship.title,
          domain: internship.domain,
          taskCount: internship.tasks.length
        },
        enrollments,
        submissions: submissionStats,
        certificates: {
          generated: certificatesGenerated,
          paid: certificatesPaid,
          unpaid: certificatesGenerated - certificatesPaid
        },
        revenue: {
          total: payments._sum.amount ? payments._sum.amount / 100 : 0,
          currency: 'INR'
        }
      },
      'Internship analytics retrieved successfully',
      200
    ));
  } catch (error) {
    next(new ApiError(`Failed to fetch analytics: ${error.message}`, 500, 'FETCH_FAILED'));
  }
};

/**
 * Get dashboard overview (admin only)
 */
const getDashboardOverview = async (req, res, next) => {
  try {
    const [totalUsers, adminUsers, totalInternships, totalEnrollments, pendingSubmissions, totalRevenue, certificatesPaid] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.internship.count(),
      prisma.userInternship.count(),
      prisma.finalProjectSubmission.count({ where: { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] } } }),
      prisma.payment.aggregate({
        where: { status: 'SUCCESS' },
        _sum: { amount: true }
      }),
      prisma.certificate.count({ where: { isPaid: true } })
    ]);

    res.json(ApiResponse.success(
      {
        users: {
          total: totalUsers,
          admins: adminUsers,
          students: totalUsers - adminUsers
        },
        programs: {
          total: totalInternships,
          enrollments: totalEnrollments,
          avgEnrollmentPerProgram: totalInternships > 0 ? Math.round(totalEnrollments / totalInternships) : 0
        },
        submissions: {
          pending: pendingSubmissions
        },
        certificates: {
          paid: certificatesPaid
        },
        revenue: {
          total: totalRevenue._sum.amount ? totalRevenue._sum.amount / 100 : 0,
          currency: 'INR'
        }
      },
      'Dashboard overview retrieved successfully',
      200
    ));
  } catch (error) {
    next(new ApiError(`Failed to fetch overview: ${error.message}`, 500, 'FETCH_FAILED'));
  }
};

/**
 * Get certificates for admin dashboard
 */
const getCertificates = async (req, res, next) => {
  try {
    const certificates = await prisma.certificate.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, college: true } },
        internship: { select: { id: true, title: true, domain: true } },
      },
      orderBy: { issuedDate: 'desc' },
      take: 50,
    });

    res.json(ApiResponse.success(
      certificates.map((certificate) => ({
        id: certificate.id,
        certificateId: certificate.certificateId,
        studentName: certificate.user?.name || 'Unknown',
        email: certificate.user?.email || '',
        college: certificate.user?.college || null,
        internship: certificate.internship?.title || 'Unknown program',
        domain: certificate.internship?.domain || '',
        issuedDate: certificate.issuedDate,
        isPaid: certificate.isPaid,
        viewUrl: `/certificate/${certificate.certificateId}`,
        downloadUrl: `/certificate/${certificate.certificateId}/pdf`,
      })),
      'Certificates retrieved successfully',
      200,
    ));
  } catch (error) {
    next(new ApiError(`Failed to fetch certificates: ${error.message}`, 500, 'FETCH_FAILED'));
  }
};

/**
 * Review final project submission (admin only)
 */
const reviewFinalProjectSubmission = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { status, feedback } = req.validatedBody;

    const submission = await prisma.finalProjectSubmission.findUnique({
      where: { id: submissionId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        internship: { select: { id: true, title: true } },
      },
    });

    if (!submission) {
      return next(new ApiError('Final project submission not found', 404, 'SUBMISSION_NOT_FOUND'));
    }

    const updatedSubmission = await prisma.finalProjectSubmission.update({
      where: { id: submissionId },
      data: {
        status,
        feedback: feedback || null,
      },
    });

    let certificate = null;

    if (status === 'APPROVED') {
      certificate = await createOrReturnCertificate({
        userId: submission.userId,
        internshipId: submission.internshipId,
      });

      await prisma.userInternship.update({
        where: { userId_internshipId: { userId: submission.userId, internshipId: submission.internshipId } },
        data: { status: 'COMPLETED', progress: 100 },
      });
    }

    res.json(ApiResponse.success(
      {
        submission: updatedSubmission,
        certificate,
      },
      `Final project submission ${status.toLowerCase()} successfully`,
      200,
    ));
  } catch (error) {
    next(new ApiError(`Failed to review final project submission: ${error.message}`, 500, 'REVIEW_FAILED'));
  }
};

module.exports = {
  getPendingSubmissions,
  getUserDetails,
  updateUserRole,
  getInternshipAnalytics,
  getDashboardOverview,
  getCertificates,
  reviewFinalProjectSubmission,
};
