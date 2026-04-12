const express = require('express');
const { createTicket, getTickets } = require('../controllers/ticketsController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../utils/validation');

const router = express.Router();

router.post('/ticket', protect, validate('createTicket'), createTicket);
router.get('/tickets', protect, getTickets);

module.exports = router;
