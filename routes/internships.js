const express = require('express');
const { getAllInternships, getInternshipById } = require('../controllers/internshipsController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', getAllInternships);
router.get('/:id', getInternshipById);

module.exports = router;
