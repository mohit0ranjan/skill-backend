const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../utils/validation');
const { getLearningPlan, markWeekComplete, submitProject } = require('../controllers/learningController');

const router = express.Router();

router.get('/learning-plan/:internshipId', protect, getLearningPlan);
router.patch('/learning-progress', protect, validate('markWeekComplete'), markWeekComplete);
router.post('/submit-project', protect, validate('submitProject'), submitProject);

module.exports = router;
