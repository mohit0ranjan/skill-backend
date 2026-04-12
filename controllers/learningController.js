const prisma = require('../prisma');
const { ApiResponse, ApiError } = require('../utils/apiResponse');
const emailServiceModule = require('../services/email.service');
const emailService = emailServiceModule.emailService || emailServiceModule;
const { generateCertificateId } = require('../utils/generateCertificateId');
const { buildCurriculumTasks, groupTasksByWeek } = require('../utils/internshipCurriculum');

async function createOrReturnCertificate({ userId, internshipId }) {
  const finalSubmission = await prisma.finalProjectSubmission.findUnique({
    where: { userId_internshipId: { userId, internshipId } },
  });

  if (!finalSubmission || finalSubmission.status !== 'APPROVED') {
    throw new ApiError('Final project must be approved before certificate generation', 409, 'SUBMISSION_NOT_APPROVED');
  }

  const existing = await prisma.certificate.findUnique({
    where: { userId_internshipId: { userId, internshipId } },
  });

  if (existing) {
    if (!existing.isPaid) {
      return prisma.certificate.update({
        where: { id: existing.id },
        data: { isPaid: true },
      });
    }

    return existing;
  }

  const certificate = await prisma.certificate.create({
    data: {
      userId,
      internshipId,
      certificateId: generateCertificateId(),
      isPaid: true,
    },
  });

  // Fetch info carefully for email
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const internship = await prisma.internship.findUnique({ where: { id: internshipId } });
  if (user && internship) {
    emailService.sendCertificateDelivery({
      userEmail: user.email,
      userName: user.name,
      internshipTitle: internship.title,
      certificateId: certificate.certificateId
    }).catch(err => console.error('Certificate email failed:', err.message));
  }

  return certificate;
}

const getLearningPlan = async (req, res, next) => {
  try {
    const { internshipId } = req.params;
    const userId = req.user.id;

    if (!internshipId) {
      return next(new ApiError('Internship ID is required', 400, 'MISSING_ID'));
    }

    const internship = await prisma.internship.findUnique({
      where: { id: internshipId },
      include: { tasks: { orderBy: { week: 'asc' } } },
    });

    if (!internship) {
      return next(new ApiError('Internship not found', 404, 'INTERNSHIP_NOT_FOUND'));
    }

    const enrollment = await prisma.userInternship.findUnique({
      where: { userId_internshipId: { userId, internshipId } },
    });

    if (!enrollment) {
      return next(new ApiError('You are not enrolled in this internship', 403, 'NOT_ENROLLED'));
    }

    const finalSubmission = await prisma.finalProjectSubmission.findUnique({
      where: { userId_internshipId: { userId, internshipId } },
    });

    const certificate = await prisma.certificate.findUnique({
      where: { userId_internshipId: { userId, internshipId } },
    });

    const sourceTasks = internship.tasks.length > 0 ? internship.tasks : buildCurriculumTasks(internship);
    const weeks = groupTasksByWeek(sourceTasks);
    const totalWeeks = weeks.length || 0;
    const progress = finalSubmission ? 100 : totalWeeks > 0
      ? Math.min(100, Math.round((enrollment.completedWeeks / totalWeeks) * 100))
      : 0;

    res.json(ApiResponse.success(
      {
        internship: {
          id: internship.id,
          title: internship.title,
          domain: internship.domain,
          duration: internship.duration,
          level: internship.level,
        },
        weeks,
        progress,
        completedWeeks: enrollment.completedWeeks,
        totalWeeks,
        finalSubmission: finalSubmission ? {
          id: finalSubmission.id,
          projectTitle: finalSubmission.projectTitle,
          projectLink: finalSubmission.projectLink,
          description: finalSubmission.description,
          fileUrl: finalSubmission.fileUrl,
          status: finalSubmission.status,
          submittedAt: finalSubmission.submittedAt,
        } : null,
        certificate: certificate ? {
          id: certificate.id,
          certificateId: certificate.certificateId,
          isPaid: certificate.isPaid,
          issuedDate: certificate.issuedDate,
        } : null,
      },
      'Learning plan retrieved successfully',
      200,
    ));
  } catch (error) {
    next(new ApiError(`Failed to load learning plan: ${error.message}`, 500, 'PLAN_FAILED'));
  }
};

const markWeekComplete = async (req, res, next) => {
  try {
    const { internshipId, weekNumber } = req.validatedBody;
    const userId = req.user.id;

    const enrollment = await prisma.userInternship.findUnique({
      where: { userId_internshipId: { userId, internshipId } },
    });

    if (!enrollment) {
      return next(new ApiError('You are not enrolled in this internship', 403, 'NOT_ENROLLED'));
    }

    const updatedWeeks = Math.max(enrollment.completedWeeks || 0, weekNumber);
    const updatedEnrollment = await prisma.userInternship.update({
      where: { userId_internshipId: { userId, internshipId } },
      data: {
        completedWeeks: updatedWeeks,
        progress: Math.min(99, updatedWeeks * 25),
        status: updatedWeeks > 0 ? 'IN_PROGRESS' : enrollment.status,
      },
    });

    res.json(ApiResponse.success(
      {
        completedWeeks: updatedEnrollment.completedWeeks,
        progress: updatedEnrollment.progress,
      },
      'Week marked as complete',
      200,
    ));
  } catch (error) {
    next(new ApiError(`Failed to update progress: ${error.message}`, 500, 'PROGRESS_FAILED'));
  }
};

const submitProject = async (req, res, next) => {
  try {
    const { internshipId, projectTitle, projectLink, description, fileUrl } = req.validatedBody;
    const userId = req.user.id;

    const internship = await prisma.internship.findUnique({
      where: { id: internshipId },
      include: { tasks: true },
    });

    if (!internship) {
      return next(new ApiError('Internship not found', 404, 'INTERNSHIP_NOT_FOUND'));
    }

    const enrollment = await prisma.userInternship.findUnique({
      where: { userId_internshipId: { userId, internshipId } },
    });

    if (!enrollment) {
      return next(new ApiError('You are not enrolled in this internship', 403, 'NOT_ENROLLED'));
    }

    const existingSubmission = await prisma.finalProjectSubmission.findUnique({
       where: { userId_internshipId: { userId, internshipId } },
    });

     if (existingSubmission && ['SUBMITTED', 'UNDER_REVIEW'].includes(existingSubmission.status)) {
      return next(new ApiError('Project already submitted and under review. We usually review within 24 hours.', 409, 'PROJECT_UNDER_REVIEW'));
     }

    if (existingSubmission && existingSubmission.status === 'APPROVED') {
       return next(new ApiError('Your project has already been approved. Modifications are not allowed.', 409, 'PROJECT_ALREADY_APPROVED'));
    }

    const submission = await prisma.finalProjectSubmission.upsert({
      where: { userId_internshipId: { userId, internshipId } },
      create: {
        userId,
        internshipId,
        projectTitle,
        projectLink,
        description,
        fileUrl: fileUrl || null,
        status: 'SUBMITTED',
      },
      update: {
        projectTitle,
        projectLink,
        description,
        fileUrl: fileUrl || null,
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    const taskWeeks = internship.tasks.length > 0 ? [...new Set(internship.tasks.map((task) => task.week))].length : buildCurriculumTasks(internship).length;
    const completedWeeks = Math.max(enrollment.completedWeeks || 0, taskWeeks);

    await prisma.userInternship.update({
      where: { userId_internshipId: { userId, internshipId } },
      data: {
        status: enrollment.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
        completedWeeks,
        progress: 100,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    if (user) {
      emailService.send({
        to: user.email,
        subject: `Your project was submitted - ${internship.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
            <div style="padding: 28px; background: linear-gradient(135deg, #16a34a, #22c55e); color: white;">
              <h1 style="margin: 0; font-size: 28px;">Submission received</h1>
              <p style="margin: 8px 0 0; opacity: 0.95;">Your final project is now awaiting review (usually within 24 hours).</p>
            </div>
            <div style="padding: 28px; color: #111827;">
              <p style="font-size: 16px; margin-top: 0;">Hi ${user.name},</p>
              <p style="font-size: 15px; line-height: 1.7; color: #4b5563;">We received your final project for <strong>${internship.title}</strong>. Our team usually reviews submissions within 24 hours. You will be notified once approved and your certificate is generated.</p>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" style="display: inline-block; margin-top: 18px; background: #111827; color: white; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 600;">Open Dashboard</a>
            </div>
          </div>
        `,
      }).catch((error) => console.error('Certificate email failed:', error.message));
    }

    res.status(201).json(ApiResponse.success(
      {
        submission: {
          id: submission.id,
          projectTitle: submission.projectTitle,
          projectLink: submission.projectLink,
          description: submission.description,
          fileUrl: submission.fileUrl,
          status: submission.status,
          submittedAt: submission.submittedAt,
        },
        certificate: null,
        reviewStatus: 'PENDING_REVIEW',
      },
      'Final project submitted successfully. Awaiting approval.',
      201,
    ));
  } catch (error) {
    next(new ApiError(`Project submission failed: ${error.message}`, 500, 'SUBMISSION_FAILED'));
  }
};

module.exports = {
  getLearningPlan,
  markWeekComplete,
  submitProject,
  createOrReturnCertificate,
};
