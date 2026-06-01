/**
 * @file controllers/firebaseAuthController.js
 * @description Firebase authentication controller.
 * Handles: User profile creation after Firebase signup, profile retrieval, profile updates
 * Registration and login happen on the client using Firebase SDK.
 */

const { validationResult } = require("express-validator");
const { AppError } = require("../middleware/errorHandler");
const {
  createOrUpdateUserProfile,
  getUserProfileByUid,
  updateProfilePicture,
  getUserProfileWithStats,
} = require("../services/firebaseAuthService");

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Checks express-validator results and throws a 400 error if any fail.
 * Call at the top of every controller that uses validation middleware.
 *
 * @param {Request} req - Express request with validation results
 */
const checkValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err = new AppError("Validation failed", 400);
    err.errors = errors.array();
    throw err;
  }
};

// ── Controllers ──────────────────────────────────────────────────────────────

/**
 * @desc   Create user profile on first login (called by client after Firebase signup)
 * @route  POST /api/auth/create-profile
 * @access Protected (requires Firebase token)
 */
const createProfile = async (req, res, next) => {
  try {
    checkValidation(req);

    const { name, phone } = req.body;
    const uid = req.user.uid;
    const email = req.user.email;

    // Create or update user profile in database
    const profile = await createOrUpdateUserProfile(uid, email, name, phone);

    res.status(201).json({
      success: true,
      message: "Profile created successfully!",
      owner: profile,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Get the currently logged-in user's profile
 * @route  GET /api/auth/me
 * @access Protected (requires Firebase token)
 */
const getMe = async (req, res, next) => {
  try {
    const uid = req.user.uid;

    // Get profile with stats
    const profile = await getUserProfileWithStats(uid);

    res.status(200).json({
      success: true,
      owner: profile,
      stats: profile.stats,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Update user profile (name, phone, profile_pic)
 * @route  PUT /api/auth/me
 * @access Protected
 */
const updateMe = async (req, res, next) => {
  try {
    const { name, phone } = req.body;
    const uid = req.user.uid;

    // If a profile picture was uploaded via Firebase middleware
    let profilePicUrl = undefined;
    if (req.fileUrl) {
      profilePicUrl = req.fileUrl;
    }

    // Get current profile
    let profile = await getUserProfileByUid(uid);
    if (!profile) {
      throw new AppError("User profile not found", 404);
    }

    // Update profile
    profile = await createOrUpdateUserProfile(
      uid,
      profile.email,
      name || profile.name,
      phone || profile.phone,
    );

    // Update profile picture if provided
    if (profilePicUrl) {
      profile = await updateProfilePicture(uid, profilePicUrl);
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully!",
      owner: profile,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Check if user profile exists (useful after Firebase signup)
 * @route  GET /api/auth/profile-exists
 * @access Protected
 */
const profileExists = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const profile = await getUserProfileByUid(uid);

    res.status(200).json({
      success: true,
      exists: !!profile,
      profile: profile || null,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createProfile,
  getMe,
  updateMe,
  profileExists,
};
