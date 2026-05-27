/**
 * @file middleware/errorHandler.js
 * @description Global error handling middleware.
 * Catches all errors thrown inside controllers and returns
 * consistent JSON error responses with appropriate HTTP status codes.
 */

/**
 * Custom application error class.
 * Throw this inside controllers to return specific status codes.
 *
 * @example
 * throw new AppError('Building not found', 404);
 */
class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code (default: 500)
   */
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Distinguishes known errors from unexpected bugs

    // Captures the stack trace properly for debugging
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Express global error handler middleware.
 * Must be registered LAST in server.js (after all routes).
 * Signature MUST have 4 params for Express to treat it as error middleware.
 *
 * @param {Error}    err  - Error object (may be AppError or unexpected Error)
 * @param {Request}  req  - Express request
 * @param {Response} res  - Express response
 * @param {Function} next - Express next (unused but required in signature)
 */
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  // Set default status code — 500 for unexpected errors
  const statusCode = err.statusCode || 500;
  const isDev      = process.env.NODE_ENV === 'development';

  // Log all errors to console (in production, replace with a logger like Winston)
  console.error(`[ERROR] ${req.method} ${req.path} → ${statusCode}: ${err.message}`);
  if (isDev && err.stack) {
    console.error(err.stack);
  }

  // ── Handle specific PostgreSQL / pg errors ──────────────────────────────
  // Unique constraint violation (e.g. duplicate email, duplicate unit number)
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'A record with this value already exists.',
      detail: isDev ? err.detail : undefined,
    });
  }

  // Foreign key violation (e.g. referencing a non-existent building_id)
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referenced record does not exist.',
      detail: isDev ? err.detail : undefined,
    });
  }

  // Invalid UUID format in query parameter
  if (err.code === '22P02') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format. Must be a valid UUID.',
    });
  }

  // ── Handle JWT errors ────────────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token. Please login again.',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired. Please login again.',
    });
  }

  // ── Default error response ───────────────────────────────────────────────
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    // Only expose stack trace in development (never in production)
    stack: isDev ? err.stack : undefined,
  });
};

module.exports = { AppError, errorHandler };
