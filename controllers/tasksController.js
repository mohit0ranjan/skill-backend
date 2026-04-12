const prisma = require('../prisma');
const { ApiResponse, ApiError } = require('../utils/apiResponse');

/**
 * Get tasks for internship with user's submission status
 */
const getTasksByInternship = async (req, res, next) => {
  try {
    const { internshipId } = req.params;

    if (!internshipId) {
      return next(new ApiError('Internship ID is required', 400, 'MISSING_ID'));
    }

    const tasks = await prisma.task.findMany({
      where: { internshipId },
      orderBy: { week: 'asc' }
    });

    // Get user's submissions for these tasks
    const userId = req.user.id;
    const submissions = await prisma.submission.findMany({
      where: {
        userId,
        taskId: { in: tasks.map(t => t.id) }
      }
    });

    // Map submissions to tasks
    const tasksWithStatus = tasks.map(task => {
      const submission = submissions.find(s => s.taskId === task.id);
      return {
        ...task,
        submission: submission || null,
      };
    });

    // Group by week
    const groupedTasks = tasksWithStatus.reduce((acc, task) => {
      if (!acc[task.week]) {
        acc[task.week] = [];
      }
      acc[task.week].push(task);
      return acc;
    }, {});

    res.json(ApiResponse.success(
      groupedTasks,
      'Tasks retrieved successfully',
      200
    ));
  } catch (error) {
    next(new ApiError(`Failed to fetch tasks: ${error.message}`, 500, 'FETCH_FAILED'));
  }
};

/**
 * Submit task solution (student)
 */
const submitTask = async (req, res, next) => {
  try {
    const { taskId, githubLink } = req.validatedBody;
    const userId = req.user.id;

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return next(new ApiError('Task not found', 404, 'TASK_NOT_FOUND'));
    }

    const enrollment = await prisma.userInternship.findUnique({
      where: { userId_internshipId: { userId, internshipId: task.internshipId } }
    });

    if (!enrollment) {
      return next(new ApiError('Not enrolled in this internship', 403, 'NOT_ENROLLED'));
    }

    const existingSubmission = await prisma.submission.findUnique({
      where: { userId_taskId: { userId, taskId } },
    });

    if (existingSubmission && existingSubmission.status === 'APPROVED') {
       return next(new ApiError('Cannot update an approved task', 409, 'TASK_ALREADY_APPROVED'));
    }

    const submission = await prisma.submission.upsert({
      where: { userId_taskId: { userId, taskId } },
      create: {
        userId,
        taskId,
        githubLink,
        status: 'SUBMITTED'
      },
      update: {
        githubLink,
        status: 'SUBMITTED',
        updatedAt: new Date()
      }
    });

    res.json(ApiResponse.success(
      { submission },
      'Task submitted successfully',
      200
    ));
  } catch (error) {
    next(new ApiError(`Submission failed: ${error.message}`, 500, 'SUBMISSION_FAILED'));
  }
};

/**
 * Evaluate submission (admin only)
 * RBAC: Requires ADMIN role
 */
const evaluateSubmission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, feedback } = req.validatedBody;

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, name: true } },
        task: { select: { id: true, title: true, internshipId: true } }
      }
    });

    if (!submission) {
      return next(new ApiError('Submission not found', 404, 'SUBMISSION_NOT_FOUND'));
    }

    const updated = await prisma.submission.update({
      where: { id },
      data: { status, feedback: feedback || null }
    });

    res.json(ApiResponse.success(
      { submission: updated },
      `Submission ${status.toLowerCase()} successfully`,
      200
    ));
  } catch (error) {
    next(new ApiError(`Evaluation failed: ${error.message}`, 500, 'EVALUATION_FAILED'));
  }
};

module.exports = { getTasksByInternship, submitTask, evaluateSubmission };
