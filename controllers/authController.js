const bcrypt = require('bcrypt');
const prisma = require('../prisma');
const { generateToken, generateResetToken, verifyToken } = require('../utils/jwt');
const { ApiResponse, ApiError } = require('../utils/apiResponse');
const emailServiceModule = require('../services/email.service');
const emailService = emailServiceModule.emailService || emailServiceModule;
const {
  getPasswordResetRequestEmailHtml,
  getPasswordResetSuccessEmailHtml,
} = require('../utils/emailTemplates');
const { isDatabaseUnavailableError, getFallbackUserByEmail, getFallbackUserById, fallbackUsers } = require('../utils/devFallback');

/**
 * User Signup
 * POST /auth/signup
 */
const signup = async (req, res, next) => {
  let name;
  let email;
  let password;
  let college;
  let year;
  let hashedPassword;

  try {
    ({ name, email, password, college, year } = req.validatedBody);
    console.log(`[SIGNUP] Start email=${email} name=${name}`);

    // Check if user already exists
    const userExists = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (userExists) {
      console.log(`[SIGNUP] BLOCKED duplicate email=${email}`);
      return next(new ApiError('Email already registered', 400, 'DUPLICATE_EMAIL'));
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase(),
        password: hashedPassword,
        college: college ? college.trim() : null,
        year: year ? year.trim() : null,
        role: 'USER',
        emailVerified: false,
      },
    });
    console.log(`[SIGNUP] DB insert OK userId=${user.id} email=${user.email}`);

    // Generate JWT token
    const token = generateToken(user.id);
    // Send onboarding email (non-blocking). Enrollment email is triggered only after paid enrollment.
    emailService.sendOnboardingWelcome({
      userEmail: user.email,
      userName: user.name,
    }).then(() => console.log(`[SIGNUP] Email queued to=${user.email}`))
      .catch(err => console.error(`[SIGNUP] Email FAILED to=${user.email} err=${err.message}`));

    // Return response
    const response = ApiResponse.success(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        college: user.college,
        year: user.year,
        role: user.role,
        token,
      },
      'Signup successful',
      201
    );

    console.log(`[SIGNUP] Complete userId=${user.id}`);
    res.status(201).json(response);
  } catch (error) {
    if (isDatabaseUnavailableError(error) && process.env.NODE_ENV === 'development') {
      const existing = getFallbackUserByEmail(email);

      if (existing) {
        return next(new ApiError('Email already registered', 400, 'DUPLICATE_EMAIL'));
      }

      const fallbackUser = {
        id: `dev-user-${Date.now()}`,
        name: name.trim(),
        email: email.toLowerCase(),
        password: hashedPassword || bcrypt.hashSync(password, 10),
        college: college ? college.trim() : null,
        year: year ? year.trim() : null,
        role: 'USER',
        emailVerified: false,
      };

      fallbackUsers.push(fallbackUser);

      const token = generateToken(fallbackUser.id);

      return res.status(201).json(ApiResponse.success(
        {
          id: fallbackUser.id,
          name: fallbackUser.name,
          email: fallbackUser.email,
          college: fallbackUser.college,
          year: fallbackUser.year,
          role: fallbackUser.role,
          emailVerified: fallbackUser.emailVerified,
          token,
        },
        'Signup successful',
        201
      ));
    }

    console.error('Signup error:', error);
    next(new ApiError(
      'Signup failed. Please try again.',
      500,
      'SIGNUP_ERROR',
      process.env.NODE_ENV === 'development' ? error.message : null
    ));
  }
};

/**
 * User Login
 * POST /auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.validatedBody;
    console.log(`[LOGIN] Attempt email=${email}`);

    // Find user
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
    } catch (error) {
      if (!isDatabaseUnavailableError(error) || process.env.NODE_ENV !== 'development') {
        throw error;
      }

      user = getFallbackUserByEmail(email);
    }

    if (!user) {
      console.log(`[LOGIN] FAIL user not found email=${email}`);
      return next(new ApiError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log(`[LOGIN] FAIL wrong password email=${email}`);
      return next(new ApiError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
    }

    // Generate JWT token
    const token = generateToken(user.id);

    const response = ApiResponse.success(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        college: user.college,
        year: user.year,
        role: user.role,
        token,
      },
      'Login successful'
    );

    console.log(`[LOGIN] Success userId=${user.id}`);
    res.json(response);
  } catch (error) {
    if (isDatabaseUnavailableError(error) && process.env.NODE_ENV === 'development') {
      const fallbackUser = getFallbackUserByEmail(req.validatedBody?.email || '');

      if (!fallbackUser) {
        return next(new ApiError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
      }

      const isPasswordValid = await bcrypt.compare(req.validatedBody.password, fallbackUser.password);

      if (!isPasswordValid) {
        return next(new ApiError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
      }

      return res.json(ApiResponse.success(
        {
          id: fallbackUser.id,
          name: fallbackUser.name,
          email: fallbackUser.email,
          college: fallbackUser.college,
          year: fallbackUser.year,
          role: fallbackUser.role,
          emailVerified: fallbackUser.emailVerified,
          token: generateToken(fallbackUser.id),
        },
        'Login successful'
      ));
    }

    console.error('Login error:', error);
    next(new ApiError(
      'Login failed. Please try again.',
      500,
      'LOGIN_ERROR',
      process.env.NODE_ENV === 'development' ? error.message : null
    ));
  }
};

/**
 * Get Current User
 * GET /auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const response = ApiResponse.success(req.user, 'User profile retrieved');
    res.json(response);
  } catch (error) {
    if (isDatabaseUnavailableError(error) && process.env.NODE_ENV === 'development') {
      const fallbackUser = getFallbackUserById(req.user.id);

      if (!fallbackUser) {
        return next(new ApiError('User not found', 404, 'USER_NOT_FOUND'));
      }

      return res.json(ApiResponse.success({
        id: fallbackUser.id,
        name: fallbackUser.name,
        email: fallbackUser.email,
        role: fallbackUser.role,
        college: fallbackUser.college,
        year: fallbackUser.year,
        emailVerified: fallbackUser.emailVerified,
      }, 'User profile retrieved'));
    }

    next(new ApiError('Failed to retrieve user', 500, 'GET_USER_ERROR'));
  }
};

/**
 * Logout (Token Invalidation - client-side removal on frontend)
 * POST /auth/logout
 */
const logout = async (req, res, next) => {
  try {
    // In stateless JWT, logout is client-side (remove token from localStorage)
    // This endpoint is for audit/logging purposes
    console.log(`[LOGOUT] userId=${req.user.id}`);
    const response = ApiResponse.success(null, 'Logout successful');
    res.json(response);
  } catch (error) {
    next(new ApiError('Logout failed', 500, 'LOGOUT_ERROR'));
  }
};

/**
 * Request Password Reset
 * POST /auth/request-password-reset
 * Sends reset link via email
 */
const requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.validatedBody;
    console.log(`[RESET REQUEST] email=${email}`);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      // Don't reveal if email exists (security best practice)
      return res.json(ApiResponse.success(
        null,
        'If email exists, password reset link sent',
        200
      ));
    }

    // Generate reset token (expires in 1 hour)
    const resetToken = generateResetToken(user.id);

    // In production: send email with reset link
    // Frontend URL would be: https://yourdomain.com/reset-password?token=<resetToken>&email=<email>
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    await emailService.send({
      to: user.email,
      subject: 'Password Reset Request — SkillBridge',
      html: getPasswordResetRequestEmailHtml({
        name: user.name,
        resetLink,
      }),
    }).catch(err => console.error('Reset email failed:', err.message));

    res.json(ApiResponse.success(
      null,
      'If email exists, password reset link sent',
      200
    ));
  } catch (error) {
    next(new ApiError(`Password reset request failed: ${error.message}`, 500, 'RESET_REQUEST_FAILED'));
  }
};

/**
 * Reset Password
 * POST /auth/reset-password
 * Validates token and updates password
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.validatedBody;

    // Decode token (token expired is caught by jwt verify)
    let userId;
    try {
      const decoded = verifyToken(token, 'JWT_RESET_SECRET', 'password_reset');
      userId = decoded.id;
    } catch (err) {
      return next(new ApiError('Reset link expired or invalid', 400, 'INVALID_TOKEN'));
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return next(new ApiError('User not found', 404, 'USER_NOT_FOUND'));
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });
    console.log(`[RESET PASSWORD] DB update OK userId=${userId}`);

    // Send confirmation email
    await emailService.send({
      to: user.email,
      subject: 'Password Reset Successful — SkillBridge',
      html: getPasswordResetSuccessEmailHtml({
        name: user.name,
      }),
    }).catch(err => console.error('Confirmation email failed:', err.message));

    res.json(ApiResponse.success(
      { message: 'Password reset successfully' },
      'You can now login with your new password',
      200
    ));
  } catch (error) {
    next(new ApiError(`Password reset failed: ${error.message}`, 500, 'RESET_FAILED'));
  }
};

/**
 * Verify Email
 * POST /auth/verify-email
 * Marks email as verified (future: can add email verification step)
 */
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.validatedBody;

    // Decode token
    let userId;
    try {
      const decoded = verifyToken(token, 'JWT_VERIFY_EMAIL_SECRET', 'email_verify');
      userId = decoded.id;
    } catch (err) {
      return next(new ApiError('Verification link expired or invalid', 400, 'INVALID_TOKEN'));
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return next(new ApiError('User not found', 404, 'USER_NOT_FOUND'));
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });
    console.log(`[VERIFY EMAIL] Verified userId=${userId}`);

    res.json(ApiResponse.success(
      { verified: true },
      'Email verified successfully',
      200
    ));
  } catch (error) {
    next(new ApiError(`Email verification failed: ${error.message}`, 500, 'VERIFICATION_FAILED'));
  }
};

module.exports = { signup, login, getMe, logout, requestPasswordReset, resetPassword, verifyEmail };
