const express = require('express');
const { signup, login, getMe, logout, requestPasswordReset, resetPassword, verifyEmail } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../utils/validation');

const router = express.Router();

/**
 * @route POST /auth/signup
 * @desc Register a new user
 * @access Public
 */
router.post('/signup', validate('signup'), signup);

/**
 * @route POST /auth/login
 * @desc Login user
 * @access Public
 */
router.post('/login', validate('login'), login);

/**
 * @route GET /auth/me
 * @desc Get current user profile
 * @access Protected
 */
router.get('/me', protect, getMe);

/**
 * @route POST /auth/logout
 * @desc Logout user
 * @access Protected
 */
router.post('/logout', protect, logout);

/**
 * @route POST /auth/request-password-reset
 * @desc Request password reset email
 * @access Public
 */
router.post('/request-password-reset', validate('requestPasswordReset'), requestPasswordReset);

/**
 * @route POST /auth/reset-password
 * @desc Reset password with token
 * @access Public
 */
router.post('/reset-password', validate('resetPassword'), resetPassword);

/**
 * @route POST /auth/verify-email
 * @desc Verify email with token
 * @access Public
 */
router.post('/verify-email', validate('verifyEmail'), verifyEmail);

module.exports = router;
