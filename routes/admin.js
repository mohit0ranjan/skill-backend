const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/rbacMiddleware');
const { validate } = require('../utils/validation');
const { getAllTickets, updateTicketStatus, replyToTicket } = require('../controllers/ticketsController');
const {
  getPendingSubmissions,
  getUserDetails,
  updateUserRole,
  getInternshipAnalytics,
  getDashboardOverview,
  getCertificates,
  reviewFinalProjectSubmission
} = require('../controllers/adminController');

const router = express.Router();

// All admin routes protected with auth + admin check
router.use(protect, adminOnly);

// Dashboard
router.get('/dashboard', getDashboardOverview);

// Submissions
router.get('/submissions', getPendingSubmissions);
router.patch('/final-submission/:submissionId', validate('reviewFinalSubmission'), reviewFinalProjectSubmission);

// Users
router.get('/user/:userId', getUserDetails);
router.patch('/user/:userId/role', validate('updateUserRole'), updateUserRole);

// Analytics
router.get('/internship/:internshipId/analytics', getInternshipAnalytics);

// Certificates
router.get('/certificates', getCertificates);

// Support
router.get('/tickets', getAllTickets);
router.patch('/tickets/:id', updateTicketStatus);
router.post('/tickets/reply', validate('replyTicket'), replyToTicket);

module.exports = router;
