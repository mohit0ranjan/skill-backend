const express = require('express');
const { getTasksByInternship, submitTask, evaluateSubmission } = require('../controllers/tasksController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/rbacMiddleware');
const { validate } = require('../utils/validation');

const router = express.Router();

router.get('/tasks/:internshipId', protect, getTasksByInternship);
router.post('/submit-task', protect, validate('submitTask'), submitTask);
router.patch('/submission/:id', protect, adminOnly, validate('evaluateSubmission'), evaluateSubmission);

module.exports = router;
