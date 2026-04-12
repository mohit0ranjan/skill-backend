/**
 * Centralized API Response Handler
 * Ensures consistent response format across all endpoints
 */

class ApiResponse {
  static success(data, message = 'Success', statusCode = 200) {
    return {
      success: true,
      statusCode,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  static error(message = 'Error', statusCode = 400, errorCode = 'ERROR', details = null) {
    return {
      success: false,
      statusCode,
      message,
      errorCode,
      ...(details && { details }),
      timestamp: new Date().toISOString(),
    };
  }

  static paginated(data, total, page, limit) {
    return {
      success: true,
      statusCode: 200,
      message: 'Success',
      data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
      timestamp: new Date().toISOString(),
    };
  }
}

class ApiError extends Error {
  constructor(message, statusCode = 400, errorCode = 'ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.name = 'ApiError';
  }
}

module.exports = { ApiResponse, ApiError };
