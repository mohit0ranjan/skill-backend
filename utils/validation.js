/**
 * Input Validation using Joi
 * Centralized validation for all API inputs
 */

const Joi = require('joi');
const { ApiError } = require('./apiResponse');

// Define reusable schemas
const schemas = {
  // Auth
  signup: Joi.object({
    name: Joi.string().min(2).max(100).required().trim(),
    email: Joi.string().email().required().lowercase(),
    password: Joi.string().min(8).max(50).required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
      .message('Password must contain uppercase, lowercase, number, and special char'),
    college: Joi.string().max(100).optional().allow(null),
    year: Joi.string().max(50).optional().allow(null),
  }),

  login: Joi.object({
    email: Joi.string().email().required().lowercase(),
    password: Joi.string().required(),
  }),

  // Internship Enrollment
  enroll: Joi.object({
    internshipId: Joi.string().uuid().required(),
  }),

  // Task Submission
  submitTask: Joi.object({
    taskId: Joi.string().uuid().required(),
    githubLink: Joi.string().uri().required(),
  }),

  markWeekComplete: Joi.object({
    internshipId: Joi.string().uuid().required(),
    weekNumber: Joi.number().integer().positive().required(),
  }),

  submitProject: Joi.object({
    internshipId: Joi.string().uuid().required(),
    projectTitle: Joi.string().min(3).max(150).required().trim(),
    projectLink: Joi.string().uri().required(),
    description: Joi.string().min(20).max(5000).required().trim(),
    fileUrl: Joi.string().uri().optional().allow(null, ''),
  }),

  // Payment
  createOrder: Joi.object({
    amount: Joi.number().positive().required(),
    internshipId: Joi.string().uuid().optional(),
    internshipTitle: Joi.string().min(3).max(150).optional(),
    internshipDomain: Joi.string().max(100).optional().allow('', null),
    internshipDuration: Joi.string().max(50).optional().allow('', null),
    internshipLevel: Joi.string().max(80).optional().allow('', null),
    internshipDescription: Joi.string().max(1000).optional().allow('', null),
    certificateId: Joi.string().uuid().optional(),
  }),

  verifyPayment: Joi.object({
    razorpay_order_id: Joi.string().required(),
    razorpay_payment_id: Joi.string().required(),
    razorpay_signature: Joi.string().required(),
    paymentId: Joi.string().uuid().required(),
    internshipId: Joi.string().uuid().optional(),
  }),

  markPaymentFailed: Joi.object({
    razorpay_order_id: Joi.string().required(),
    paymentId: Joi.string().uuid().required(),
    internshipId: Joi.string().uuid().optional(),
    reason: Joi.string().max(500).optional().allow('', null),
  }),

  refundPayment: Joi.object({
    paymentId: Joi.string().uuid().required(),
    amount: Joi.number().integer().positive().optional(), // paise
    reason: Joi.string().max(500).optional().allow('', null),
  }),

  // Ticket
  createTicket: Joi.object({
    subject: Joi.string().min(5).max(200).required().trim(),
    message: Joi.string().min(10).max(5000).required().trim(),
  }),

  replyTicket: Joi.object({
    ticketId: Joi.string().uuid().required(),
    reply: Joi.string().min(5).max(5000).required().trim(),
    status: Joi.string().valid('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED').optional(),
  }),

  // Certificate
  generateCertificate: Joi.object({
    internshipId: Joi.string().uuid().required(),
  }),

  // Tasks - for evaluation (admin only)
  evaluateSubmission: Joi.object({
    status: Joi.string().valid('UNDER_REVIEW', 'APPROVED', 'REJECTED').required(),
    feedback: Joi.string().max(5000).optional().allow(null),
  }),

  reviewFinalSubmission: Joi.object({
    status: Joi.string().valid('APPROVED', 'REJECTED').required(),
    feedback: Joi.string().max(5000).optional().allow(null),
  }),

  // Auth - password reset
  requestPasswordReset: Joi.object({
    email: Joi.string().email().required().lowercase(),
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    newPassword: Joi.string().min(8).max(50).required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
      .message('Password must contain uppercase, lowercase, number, and special char'),
  }),

  // Auth - email verification
  verifyEmail: Joi.object({
    token: Joi.string().required(),
  }),

  // Admin - user management
  updateUserRole: Joi.object({
    role: Joi.string().valid('USER', 'ADMIN').required(),
  }),
};

/**
 * Validation middleware factory
 * @param {string} schemaName - Name of the schema to validate against
 * @returns {Function} Express middleware
 */
const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    if (!schema) {
      return next(new ApiError(`Validation schema '${schemaName}' not found`, 500, 'VALIDATION_SETUP_ERROR'));
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return next(new ApiError('Validation failed', 400, 'VALIDATION_ERROR', details));
    }

    req.validatedBody = value;
    next();
  };
};

module.exports = { validate, schemas, ApiError };
