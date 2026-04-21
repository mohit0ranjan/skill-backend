/**
 * M1 FIX: Standard pagination utility for all list endpoints.
 * Extracts page/limit from query params with bounds checking.
 */

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;

/**
 * Parse pagination parameters from request query.
 * @param {import('express').Request} req
 * @returns {{ skip: number, take: number, page: number, limit: number }}
 */
const parsePagination = (req) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;
  return { skip, take: limit, page, limit };
};

/**
 * Build a paginated response object.
 * @param {any[]} data - The items for the current page
 * @param {number} total - Total count of matching items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @returns {{ items: any[], pagination: object }}
 */
const paginatedResult = (data, total, page, limit) => ({
  items: data,
  pagination: {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
    hasNextPage: page < Math.ceil(total / limit),
    hasPrevPage: page > 1,
  },
});

module.exports = { parsePagination, paginatedResult };
