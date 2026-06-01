/**
 * @file routes/firebaseAuthRoutes.js
 * @description Firebase authentication routes.
 * Note: Registration and login happen on the client using Firebase SDK.
 * These routes only handle user profile management.
 */

const express = require("express");
const { body } = require("express-validator");
const { protect } = require("../middleware/firebaseAuth");
const { singleFileMiddleware } = require("../middleware/firebaseUpload");
const firebaseAuthController = require("../controllers/firebaseAuthController");

const router = express.Router();

/**
 * POST /api/auth/create-profile
 * Create user profile after Firebase registration
 * @body {string} name - User full name (required)
 * @body {string} phone - User phone number (optional)
 * @header {string} Authorization - Bearer <Firebase ID Token>
 */
router.post(
  "/create-profile",
  protect,
  [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Name is required")
      .isLength({ min: 2 })
      .withMessage("Name must be at least 2 characters"),
    body("phone")
      .optional()
      .trim()
      .matches(/^\+?[1-9]\d{1,14}$/)
      .withMessage("Phone must be a valid E.164 format"),
  ],
  firebaseAuthController.createProfile,
);

/**
 * GET /api/auth/me
 * Get currently logged-in user's profile with stats
 * @header {string} Authorization - Bearer <Firebase ID Token>
 */
router.get("/me", protect, firebaseAuthController.getMe);

/**
 * GET /api/auth/profile-exists
 * Check if user profile exists in our database
 * @header {string} Authorization - Bearer <Firebase ID Token>
 */
router.get("/profile-exists", protect, firebaseAuthController.profileExists);

/**
 * PUT /api/auth/me
 * Update user profile (name, phone, profile picture)
 * @body {string} name - Updated name (optional)
 * @body {string} phone - Updated phone (optional)
 * @header {string} Authorization - Bearer <Firebase ID Token>
 * @file {File} profile_pic - Profile picture (optional, will be uploaded to Firebase Storage)
 */
router.put(
  "/me",
  protect,
  singleFileMiddleware("profile_pic"),
  [
    body("name")
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage("Name must be at least 2 characters"),
    body("phone")
      .optional()
      .trim()
      .matches(/^\+?[1-9]\d{1,14}$/)
      .withMessage("Phone must be a valid E.164 format"),
  ],
  firebaseAuthController.updateMe,
);

module.exports = router;
