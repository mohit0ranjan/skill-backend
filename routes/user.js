const express = require('express');
const { enroll, getDashboard, getMyInternships } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../utils/validation');

const router = express.Router();

router.post('/enroll', protect, validate('enroll'), enroll);
router.get('/dashboard', protect, getDashboard);
router.get('/my-internships', protect, getMyInternships);

module.exports = router;
