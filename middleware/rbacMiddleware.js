/**
 * Role-Based Access Control Middleware
 * Implements admin, student, and role-specific protections
 */

const { ApiError } = require('../utils/apiResponse');

const normalizeRole = (role) => String(role || '').trim().toUpperCase();

/**
 * Verify user is admin
 */
const adminOnly = async (req, res, next) => {
  try {
    const role = normalizeRole(req.user?.role);

    if (!req.user || role !== 'ADMIN') {
      return next(new ApiError('Forbidden: admin access required', 403, 'FORBIDDEN'));
    }

    next();
  } catch (error) {
    next(new ApiError('Authorization check failed', 500, 'AUTH_ERROR'));
  }
};

/**
 * Verify user is student
 */
const studentOnly = async (req, res, next) => {
  try {
    const role = normalizeRole(req.user?.role);

    if (!req.user) {
      return next(new ApiError('Unauthorized', 401, 'UNAUTHORIZED'));
    }

    if (role !== 'USER') {
      return next(new ApiError('Forbidden: Student access required', 403, 'FORBIDDEN'));
    }

    next();
  } catch (error) {
    next(new ApiError('Authorization check failed', 500, 'AUTH_ERROR'));
  }
};

/**
 * Verify user owns the resource
 */
const ownsResource = (resourceOwnerIdField = 'userId') => {
  return async (req, res, next) => {
    try {
      const role = normalizeRole(req.user?.role);

      if (!req.user) {
        return next(new ApiError('Unauthorized', 401, 'UNAUTHORIZED'));
      }

      const resourceOwnerId = req.body[resourceOwnerIdField] || req.params[resourceOwnerIdField];

      // Fail-closed: if the owner ID field is missing, deny access (unless admin)
      if (!resourceOwnerId && role !== 'ADMIN') {
        return next(new ApiError('Forbidden: Resource owner could not be determined', 403, 'FORBIDDEN'));
      }

      if (resourceOwnerId && resourceOwnerId !== req.user.id && role !== 'ADMIN') {
        return next(new ApiError('Forbidden: Cannot access this resource', 403, 'FORBIDDEN'));
      }

      next();
    } catch (error) {
      next(new ApiError('Authorization check failed', 500, 'AUTH_ERROR'));
    }
  };
};

module.exports = { adminOnly, studentOnly, ownsResource };
