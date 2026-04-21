const bcrypt = require('bcrypt');
const prisma = require('../prisma');
const { ApiResponse, ApiError, internalError } = require('../utils/apiResponse');
const logger = require('../utils/logger');
const { parsePagination, paginatedResult } = require('../utils/pagination');
const { generateToken } = require('../utils/jwt');
const { createOrReturnCertificate } = require('./learningController');
const emailServiceModule = require('../services/email.service');
const emailService = emailServiceModule.emailService || emailServiceModule;
const { sanitizeParams } = require('../utils/sanitize');
const { recordAudit } = require('../utils/auditLog');
const {
  getWelcomeEmailHtml,
  getEnrollmentConfirmationEmailHtml,
  getPaymentSuccessEmailHtml,
  getCertificateDeliveryEmailHtml,
  getSupportReplyEmailHtml,
  renderPremiumEmail,
} = require('../utils/emailTemplates');

// H4 FIX: Super-admin email whitelist — only these admins can promote others to ADMIN.
const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
const MANAGED_USER_ROLES = new Set(['USER', 'ADMIN', 'INTERN']);

const normalizeRole = (role) => String(role || '').trim().toUpperCase();

const createManagedUserRecord = async ({ name, email, password, role }, createdBy) => {
  const normalizedEmail = email.toLowerCase();
  const normalizedRole = normalizeRole(role || 'INTERN');

  if (!MANAGED_USER_ROLES.has(normalizedRole)) {
    throw new ApiError('Invalid role supplied', 400, 'INVALID_ROLE');
  }

  if (normalizedRole === 'ADMIN') {
    const callerEmail = String(createdBy?.email || '').toLowerCase();
    if (SUPER_ADMIN_EMAILS.length > 0 && !SUPER_ADMIN_EMAILS.includes(callerEmail)) {
      throw new ApiError('Only super-admins can create ADMIN users', 403, 'INSUFFICIENT_PRIVILEGE');
    }
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw new ApiError('A user with this email already exists', 409, 'USER_EXISTS');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  return prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: normalizedRole,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
};

/**
 * Admin login
 * POST /admin/login
 */
const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.validatedBody;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || normalizeRole(user.role) !== 'ADMIN') {
      return next(new ApiError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return next(new ApiError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
    }

    const token = generateToken(user.id, '7d', 'JWT_SECRET', 'auth', user.tokenVersion || 0);

    return res.json(ApiResponse.success(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token,
      },
      'Admin login successful',
      200
    ));
  } catch (error) {
    logger.error('admin.login.error', { email: req.validatedBody?.email, errorMessage: error?.message });
    next(internalError('Admin login failed', 'ADMIN_LOGIN_FAILED', error));
  }
};


/**
 * Get all submissions pending review (admin only)
 * M3 FIX: Merges both standard and Workspace submissions into a single unified dashboard view.
 */
const getPendingSubmissions = async (req, res, next) => {
  try {
    const { status } = req.query;
    
    // 1. Fetch Standard Submissions
    const whereStandard = {};
    if (status) {
      whereStandard.status = status;
    } else {
      whereStandard.status = { in: ['SUBMITTED', 'UNDER_REVIEW'] };
    }

    const standardSubmissions = await prisma.finalProjectSubmission.findMany({
      where: whereStandard,
      include: {
        user: { select: { id: true, name: true, email: true, college: true } },
        internship: { select: { id: true, title: true, domain: true } }
      },
      orderBy: { submittedAt: 'desc' },
      take: 50, // Keep simple limit for merged list
    });

    // 2. Fetch Workspace Submissions
    const whereWorkspace = {};
    if (status) {
      if (status === 'SUBMITTED') whereWorkspace.status = 'PENDING';
      else whereWorkspace.status = status;
    } else {
      whereWorkspace.status = 'PENDING';
    }

    const workspaceSubmissions = await prisma.workspaceSubmission.findMany({
      where: whereWorkspace,
      include: {
        user: { select: { id: true, name: true, email: true, college: true } },
        project: { select: { id: true, title: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // 3. Normalize & Merge
    const normalizedStandard = standardSubmissions.map(s => ({
      ...s,
      type: 'STANDARD',
      projectTitle: s.projectTitle,
      projectLink: s.projectLink,
      status: s.status,
      submittedAt: s.submittedAt,
    }));

    const normalizedWorkspace = workspaceSubmissions.map(w => ({
      ...w,
      type: 'WORKSPACE',
      projectTitle: w.project.title,
      projectLink: w.githubLink,
      status: w.status === 'PENDING' ? 'SUBMITTED' : w.status,
      internship: { title: 'Workspace Project' }, // Mock structure to match frontend
      submittedAt: w.createdAt,
    }));

    const merged = [...normalizedStandard, ...normalizedWorkspace].sort((a, b) => b.submittedAt - a.submittedAt);

    res.json(ApiResponse.success(
      paginatedResult(merged, merged.length, 1, 100),
      'Pending submissions retrieved successfully',
      200
    ));
  } catch (error) {
    logger.error('admin.get_pending_submissions.error', { errorMessage: error?.message });
    next(internalError('Failed to fetch submissions', 'FETCH_FAILED', error));
  }
};

/**
 * Get user details with enrollments and submissions (admin only)
 */
const getUserDetails = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const [user, internshipsCount, submissionsCount, finalSubmissionsCount, certificatesCount, paymentsCount] = await Promise.all([
      prisma.user.findUnique({
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
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
              internship: { select: { id: true, title: true, domain: true } }
            }
          },
          submissions: {
            orderBy: { submittedAt: 'desc' },
            take: 10,
            include: {
              task: { select: { id: true, title: true } }
            }
          },
          finalSubmissions: {
            orderBy: { submittedAt: 'desc' },
            take: 10,
            include: {
              internship: { select: { id: true, title: true, domain: true } }
            }
          },
          certificates: {
            orderBy: { issuedDate: 'desc' },
            take: 10,
            include: {
              internship: { select: { title: true } }
            }
          },
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            select: {
              id: true,
              amount: true,
              status: true,
              currency: true,
              createdAt: true,
              internshipId: true,
              razorpayOrderId: true,
            }
          }
        }
      }),
      prisma.userInternship.count({ where: { userId } }),
      prisma.submission.count({ where: { userId } }),
      prisma.finalProjectSubmission.count({ where: { userId } }),
      prisma.certificate.count({ where: { userId } }),
      prisma.payment.count({ where: { userId } }),
    ]);

    if (!user) {
      return next(new ApiError('User not found', 404, 'USER_NOT_FOUND'));
    }

    res.json(ApiResponse.success(
      {
        ...user,
        counts: {
          internships: internshipsCount,
          submissions: submissionsCount,
          finalSubmissions: finalSubmissionsCount,
          certificates: certificatesCount,
          payments: paymentsCount,
        }
      },
      'User details retrieved successfully',
      200
    ));
  } catch (error) {
    logger.error('admin.get_user_details.error', { userId: req.params?.userId, errorMessage: error?.message });
    next(internalError('Failed to fetch user', 'FETCH_FAILED', error));
  }
};

/**
 * Update user role (admin only)
 * H4 FIX: Only super-admins (whitelisted emails) can promote to ADMIN.
 * C3 FIX: Increment tokenVersion to invalidate existing sessions on role change.
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.validatedBody;

    // Prevent self-role-change
    if (userId === req.user.id && role !== req.user.role) {
      return next(new ApiError('Cannot change your own role', 403, 'FORBIDDEN'));
    }

    // H4 FIX: Only super-admins can promote to ADMIN
    if (role === 'ADMIN') {
      const callerEmail = (req.user.email || '').toLowerCase();
      if (SUPER_ADMIN_EMAILS.length > 0 && !SUPER_ADMIN_EMAILS.includes(callerEmail)) {
        return next(new ApiError('Only super-admins can promote users to ADMIN', 403, 'INSUFFICIENT_PRIVILEGE'));
      }
    }

    // C3 FIX: Increment tokenVersion to force re-login after role change
    const user = await prisma.user.update({
      where: { id: userId },
      data: { role, tokenVersion: { increment: 1 } }
    });

    // M6 FIX: Record audit log
    await recordAudit({
      adminId: req.user.id,
      action: 'UPDATE_ROLE',
      targetId: userId,
      metadata: { newRole: role, previousRole: req.user.role },
    });

    res.json(ApiResponse.success(
      { user },
      `User role updated to ${role}`,
      200
    ));
  } catch (error) {
    logger.error('admin.update_user_role.error', { userId: req.params?.userId, errorMessage: error?.message });
    if (error.code === 'P2025') {
      return next(new ApiError('User not found', 404, 'USER_NOT_FOUND'));
    }
    next(internalError('Failed to update user', 'UPDATE_FAILED', error));
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
    logger.error('admin.get_internship_analytics.error', { internshipId: req.params?.internshipId, errorMessage: error?.message });
    next(internalError('Failed to fetch analytics', 'FETCH_FAILED', error));
  }
};

/**
 * Get dashboard overview (admin only)
 */
const getDashboardOverview = async (req, res, next) => {
  try {
    logger.info('admin.dashboard_overview.fetching');
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
    logger.error('admin.dashboard_overview.error', { errorMessage: error?.message });
    next(internalError('Failed to fetch overview', 'FETCH_FAILED', error));
  }
};

/**
 * Get certificates for admin dashboard
 */
const getCertificates = async (req, res, next) => {
  try {
    const { skip, take, page, limit } = parsePagination(req);

    const [certificates, total] = await Promise.all([
      prisma.certificate.findMany({
        include: {
          user: { select: { id: true, name: true, email: true, college: true } },
          internship: { select: { id: true, title: true, domain: true } },
        },
        orderBy: { issuedDate: 'desc' },
        skip,
        take,
      }),
      prisma.certificate.count(),
    ]);

    res.json(ApiResponse.success(
      paginatedResult(
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
          downloadUrl: `/certificate/${certificate.certificateId}`,
        })),
        total,
        page,
        limit
      ),
      'Certificates retrieved successfully',
      200,
    ));
  } catch (error) {
    logger.error('admin.get_certificates.error', { errorMessage: error?.message });
    next(internalError('Failed to fetch certificates', 'FETCH_FAILED', error));
  }
};

/**
 * Get screening leads for admin CRM views.
 */
const getScreeningLeads = async (req, res, next) => {
  try {
    const rows = await prisma.screeningSubmission.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            college: true,
            year: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const mapped = rows.map((row) => {
      const statusMap = {
        SUBMITTED: 'applied',
        UNDER_REVIEW: 'under_review',
        SELECTED: 'selected',
        REJECTED: 'applied',
      };

      return {
        id: row.id,
        userId: row.userId,
        name: row.user?.name || 'Unknown',
        email: row.user?.email || '',
        phone: '',
        college: row.user?.college || '',
        year: row.user?.year || '',
        branch: '',
        status: statusMap[row.status] || 'applied',
        test_submitted: true,
        test_score: row.score,
        email_sent: false,
        clicked_confirm: false,
        selection_mail_sent: false,
        payment_mail_sent: false,
        offer_sent: false,
        onboarding_sent: false,
        certificate_issued: false,
        converted: (row.user?.role || '') === 'INTERN',
        created_at: row.createdAt,
      };
    });

    res.json(ApiResponse.success(mapped, 'Screening leads retrieved successfully', 200));
  } catch (error) {
    logger.error('admin.get_screening_leads.error', { errorMessage: error?.message });
    next(internalError('Failed to fetch screening leads', 'FETCH_FAILED', error));
  }
};

/**
 * Review final project submission (admin only)
 */
const reviewFinalProjectSubmission = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { status, feedback } = req.validatedBody;
    logger.info('admin.review_submission.start', { submissionId, status });

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
    logger.info('admin.review_submission.updated', { submissionId, status });

    let certificate = null;

    if (status === 'APPROVED') {
      certificate = await createOrReturnCertificate({
        userId: submission.userId,
        internshipId: submission.internshipId,
      });
      logger.info('admin.review_submission.certificate_autogenerated', { userId: submission.userId, internshipId: submission.internshipId });

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
    logger.error('admin.review_submission.error', { submissionId: req.params?.submissionId, errorMessage: error?.message });
    next(internalError('Failed to review final project submission', 'REVIEW_FAILED', error));
  }
};

/**
 * Send manual admin CRM email to a specific user.
 * I1 FIX: enables admin dashboard to dispatch Selection/Payment/Offer/Onboarding emails.
 * POST /admin/send-email
 */
const sendAdminEmail = async (req, res, next) => {
  try {
    const { userId, templateType, params: rawParams } = req.validatedBody;
    // H3 FIX: sanitize all user-supplied template params to prevent XSS injection
    const params = sanitizeParams(rawParams || {});

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return next(new ApiError('User not found', 404, 'USER_NOT_FOUND'));
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://skillbridge.co.in';
    const dashboardUrl = `${frontendUrl}/dashboard`;
    const supportEmail = process.env.SUPPORT_EMAIL || 'support@skillbridge.co.in';

    let subject, html;

    switch (templateType) {
      case 'SELECTION': {
        subject = `🎉 Congratulations! You've been selected — ${params?.programTitle || 'SkillBridge'}${params?.cohort ? ` (${params.cohort})` : ''}`;
        html = renderPremiumEmail({
          eyebrow: 'SKILLBRIDGE • SELECTION',
          title: 'You have been selected!',
          intro: 'Congratulations! Your application has been reviewed and you have been selected.',
          highlight: params?.selectionNote || 'Your performance stood out. Welcome to the SkillBridge program.',
          body: [
            `Hi <strong>${user.name}</strong>,`,
            `We are thrilled to inform you that you have been selected for the <strong>${params?.programTitle || 'SkillBridge Internship Program'}</strong>${params?.cohort ? ` — ${params.cohort}` : ''}.`,
            params?.nextSteps || 'Our team will reach out with next steps shortly. Please check your dashboard for updates.',
          ],
          cards: [
            { label: 'Program', value: params?.programTitle || 'SkillBridge Internship' },
            { label: 'Status', value: 'Selected' },
            ...(params?.cohort ? [{ label: 'Cohort', value: params.cohort }] : []),
            ...(params?.startDate ? [{ label: 'Start Date', value: params.startDate }] : []),
          ],
          ctaLabel: 'View Dashboard',
          ctaUrl: dashboardUrl,
          footerNote: `Support: ${supportEmail}`,
        });
        break;
      }

      case 'PAYMENT': {
        subject = `Payment Instructions — ${params?.programTitle || 'SkillBridge'}`;
        html = renderPremiumEmail({
          eyebrow: 'SKILLBRIDGE • PAYMENT',
          title: 'Payment Instructions',
          intro: 'Complete your enrollment by following the payment instructions below.',
          highlight: params?.paymentNote || 'Your seat is reserved. Please complete payment to confirm enrollment.',
          body: [
            `Hi <strong>${user.name}</strong>,`,
            `To confirm your seat in <strong>${params?.programTitle || 'the program'}</strong>, please complete the payment.`,
            params?.instructions || 'Visit the link below to proceed with payment.',
          ],
          cards: [
            { label: 'Program', value: params?.programTitle || 'SkillBridge Internship' },
            ...(params?.amount ? [{ label: 'Amount', value: `₹${params.amount}` }] : []),
            ...(params?.deadline ? [{ label: 'Deadline', value: params.deadline }] : []),
          ],
          ctaLabel: 'Complete Payment',
          ctaUrl: params?.paymentUrl || dashboardUrl,
          footerNote: `Support: ${supportEmail}`,
        });
        break;
      }

      case 'OFFER': {
        subject = `📄 Your Offer Letter — ${params?.programTitle || 'SkillBridge'}`;
        html = renderPremiumEmail({
          eyebrow: 'SKILLBRIDGE • OFFER',
          title: 'Offer Letter',
          intro: 'Please find your official internship offer details below.',
          highlight: params?.offerNote || 'Please review and confirm acceptance by the deadline.',
          body: [
            `Hi <strong>${user.name}</strong>,`,
            `We are pleased to extend an offer for the <strong>${params?.programTitle || 'SkillBridge Internship'}</strong>.`,
            params?.terms || 'This is a virtual internship. You will receive training, live projects, and a verified certificate upon completion.',
          ],
          cards: [
            { label: 'Program', value: params?.programTitle || 'SkillBridge Internship' },
            ...(params?.startDate ? [{ label: 'Start Date', value: params.startDate }] : []),
            ...(params?.duration ? [{ label: 'Duration', value: params.duration }] : []),
            ...(params?.stipend ? [{ label: 'Stipend', value: params.stipend }] : []),
          ],
          ctaLabel: 'Accept Offer',
          ctaUrl: params?.acceptUrl || dashboardUrl,
          footerNote: `Support: ${supportEmail}`,
        });
        break;
      }

      case 'ONBOARDING': {
        subject = `🚀 Welcome Onboard — ${params?.programTitle || 'SkillBridge'}!`;
        html = getEnrollmentConfirmationEmailHtml({
          userName: user.name,
          internshipTitle: params?.programTitle || 'SkillBridge Internship',
          internshipDuration: params?.duration || '4 Weeks',
          supportEmail,
          dashboardUrl,
        });
        break;
      }

      case 'REJECTION': {
        subject = `Application Update — ${params?.programTitle || 'SkillBridge'}`;
        html = renderPremiumEmail({
          eyebrow: 'SKILLBRIDGE • UPDATE',
          title: 'Application Update',
          intro: 'Thank you for your interest in SkillBridge.',
          highlight: params?.rejectionNote || 'We received many strong applications this cycle.',
          body: [
            `Hi <strong>${user.name}</strong>,`,
            `Thank you for applying to <strong>${params?.programTitle || 'the SkillBridge program'}</strong>.`,
            params?.message || 'After careful consideration, we are unable to offer you a position in this cohort. We encourage you to apply again in the next cycle.',
          ],
          cards: [
            { label: 'Program', value: params?.programTitle || 'SkillBridge Internship' },
            { label: 'Status', value: 'Not Selected' },
          ],
          footerNote: `Support: ${supportEmail}`,
        });
        break;
      }

      default:
        return next(new ApiError(`Unknown template type: ${templateType}`, 400, 'INVALID_TEMPLATE'));
    }

    await emailService.send({ to: user.email, subject, html });
    logger.info('admin.send_email.sent', { userId, templateType, email: user.email });

    // M6 FIX: Record audit log for email dispatch
    await recordAudit({
      adminId: req.user.id,
      action: 'SEND_EMAIL',
      targetId: userId,
      metadata: { templateType, email: user.email },
    });

    res.json(ApiResponse.success(
      { userId, templateType, email: user.email },
      `Email dispatched successfully to ${user.email}`,
      200
    ));
  } catch (error) {
    logger.error('admin.send_email.error', { userId: req.validatedBody?.userId, templateType: req.validatedBody?.templateType, errorMessage: error?.message });
    next(internalError('Failed to send email', 'EMAIL_DISPATCH_FAILED', error));
  }
};

/**
 * Get all registered users (admin only)
 */
const getAdminUsers = async (req, res, next) => {
  try {
    const { page, limit, skip, take } = parsePagination(req);
    const { search, role } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) {
      where.role = role.toUpperCase();
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          college: true,
          year: true,
          role: true,
          emailVerified: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.user.count({ where }),
    ]);

    res.json(ApiResponse.success(
      paginatedResult(users, total, page, limit),
      'Users retrieved successfully',
      200
    ));
  } catch (error) {
    logger.error('admin.get_users.error', { errorMessage: error?.message });
    next(internalError('Failed to fetch users', 'FETCH_USERS_FAILED', error));
  }
};

/**
 * Manually create an Intern account (Workspace allowed)
 */
const createManagedUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.validatedBody;
    const newUser = await createManagedUserRecord({ name, email, password, role }, req.user);

    res.status(201).json(ApiResponse.success({ user: newUser }, 'User account created successfully', 201));
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }

    logger.error('admin.create_user.error', { errorMessage: error?.message });
    next(internalError('Failed to create user account', 'CREATE_USER_FAILED', error));
  }
};

const createInternAccount = async (req, res, next) => {
  try {
    const { name, email, password } = req.validatedBody;
    const newUser = await createManagedUserRecord({ name, email, password, role: 'INTERN' }, req.user);

    res.status(201).json(ApiResponse.success({ user: newUser }, 'Intern account created successfully', 201));
  } catch (error) {
    if (error instanceof ApiError) {
      return next(error);
    }

    logger.error('admin.create_intern.error', { errorMessage: error?.message });
    next(internalError('Failed to create intern account', 'CREATE_INTERN_FAILED', error));
  }
};


module.exports = {
  adminLogin,
  getPendingSubmissions,
  getUserDetails,
  updateUserRole,
  getInternshipAnalytics,
  getDashboardOverview,
  getCertificates,
  getScreeningLeads,
  reviewFinalProjectSubmission,
  sendAdminEmail,
  getAdminUsers,
  createManagedUser,
  createInternAccount,
};
