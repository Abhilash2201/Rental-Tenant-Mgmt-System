/**
 * @file middleware/auth.js
 * @description JWT authentication middleware.
 * Protects routes by verifying the Bearer token in the Authorization header.
 * Attaches the decoded owner payload to `req.owner` for use in controllers.
 */

const jwt = require('jsonwebtoken');
const { AppError } = require('./errorHandler');

/**
 * Authentication middleware — protects routes from unauthenticated access.
 *
 * Usage: Apply to any route that requires a logged-in owner:
 *   router.get('/buildings', protect, buildingController.getAll);
 *
 * The token must be sent in the Authorization header:
 *   Authorization: Bearer eyJhbGci...
 *
 * @param {Request}  req  - Express request (token extracted from headers)
 * @param {Response} res  - Express response
 * @param {Function} next - Passes control to the route handler or error handler
 */
const protect = (req, res, next) => {
  try {
    // ── 1. Extract token from Authorization header ──────────────────────────
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(
        'Access denied. No token provided. Use: Authorization: Bearer <token>',
        401
      );
    }

    // Split "Bearer eyJhbGci..." → take the token part
    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new AppError('Access denied. Token is empty.', 401);
    }

    // ── 2. Verify token signature and expiry ────────────────────────────────
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    /**
     * Attach decoded owner data to req so controllers can access it.
     * decoded contains: { id, email, name, iat, exp }
     */
    req.owner = decoded;

    // ── 3. Pass to next middleware / route handler ──────────────────────────
    next();
  } catch (err) {
    // jwt.verify throws JsonWebTokenError or TokenExpiredError
    // These are handled in the global errorHandler middleware
    next(err);
  }
};

/**
 * Helper to generate a signed JWT token for a given owner.
 * Called after successful login or registration.
 *
 * @param {Object} payload - Data to embed in the token (owner id, email, name)
 * @returns {string} Signed JWT token string
 */
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

module.exports = { protect, generateToken };
