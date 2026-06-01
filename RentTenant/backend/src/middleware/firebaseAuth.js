/**
 * @file middleware/firebaseAuth.js
 * @description Firebase authentication middleware.
 * Verifies Firebase ID tokens and attaches user to req.user
 *
 * Usage: Apply to any route that requires authentication
 *   router.get('/buildings', protect, buildingController.getAll);
 *
 * The token must be sent in the Authorization header:
 *   Authorization: Bearer <Firebase ID Token>
 */

const { auth } = require("../config/firebase");
const { query } = require("../config/db");
const { AppError } = require("./errorHandler");

/**
 * Firebase authentication middleware — protects routes from unauthenticated access.
 * Verifies the Firebase ID token and attaches decoded user data to req.user
 *
 * @param {Request}  req  - Express request (token extracted from headers)
 * @param {Response} res  - Express response
 * @param {Function} next - Passes control to the route handler or error handler
 */
const protect = async (req, res, next) => {
  try {
    // ── 1. Extract token from Authorization header ──────────────────────────
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(
        "Access denied. No token provided. Use: Authorization: Bearer <token>",
        401,
      );
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      throw new AppError("Access denied. Token is empty.", 401);
    }

    // ── 2. Verify Firebase token ────────────────────────────────────────────
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (err) {
      throw new AppError("Invalid or expired token.", 401);
    }

    /**
     * Attach decoded user data to req so controllers can access it.
     * Contains: { uid, email, email_verified, iat, exp, ... }
     */
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
    };

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Extended Firebase middleware — verifies token AND fetches the owner's DB record.
 * Sets both req.user (Firebase claims) and req.owner (DB row with id, name, email).
 * Use this on all routes that hit the database as an owner (buildings, tenants, etc.).
 * Use plain `protect` only on auth-profile routes that run before the DB row exists.
 */
const protectOwner = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(
        "Access denied. No token provided. Use: Authorization: Bearer <token>",
        401,
      );
    }

    const token = authHeader.split(" ")[1];
    if (!token) throw new AppError("Access denied. Token is empty.", 401);

    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (err) {
      throw new AppError("Invalid or expired token.", 401);
    }

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
    };

    // Look up owner record in DB using Firebase UID
    const result = await query(
      "SELECT id, firebase_uid, email, name, phone FROM owners WHERE firebase_uid = $1",
      [decodedToken.uid],
    );

    if (result.rows.length === 0) {
      throw new AppError(
        "Owner profile not found. Please complete registration first.",
        401,
      );
    }

    req.owner = result.rows[0];
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { protect, protectOwner };
