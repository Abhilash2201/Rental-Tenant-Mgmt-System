/**
 * @file services/firebaseAuthService.js
 * @description Service for managing user profiles in PostgreSQL after Firebase authentication.
 * Firebase handles the password, but we still keep a user profile in the DB for our app data.
 */

const { query } = require("../config/db");
const { AppError } = require("../middleware/errorHandler");

/**
 * Create or update user profile in database after Firebase registration
 * Call this after user successfully creates a Firebase account
 *
 * @param {string} uid - Firebase UID
 * @param {string} email - User email
 * @param {string} name - User full name
 * @param {string} phone - User phone number (optional)
 * @returns {Promise<Object>} Created/updated user profile
 */
const createOrUpdateUserProfile = async (uid, email, name, phone = null) => {
  try {
    // Check if profile already exists
    const existing = await query(
      "SELECT * FROM owners WHERE firebase_uid = $1",
      [uid],
    );

    if (existing.rows.length > 0) {
      // Update existing profile
      const result = await query(
        `UPDATE owners 
         SET name = $1, phone = $2, updated_at = NOW()
         WHERE firebase_uid = $3
         RETURNING id, firebase_uid, email, name, phone, profile_pic, created_at, updated_at`,
        [name, phone, uid],
      );
      return result.rows[0];
    } else {
      // Create new profile
      const result = await query(
        `INSERT INTO owners (firebase_uid, email, name, phone)
         VALUES ($1, $2, $3, $4)
         RETURNING id, firebase_uid, email, name, phone, profile_pic, created_at, updated_at`,
        [uid, email.toLowerCase(), name, phone],
      );
      return result.rows[0];
    }
  } catch (err) {
    throw new AppError("Failed to create/update user profile", 500);
  }
};

/**
 * Get user profile by Firebase UID
 *
 * @param {string} uid - Firebase UID
 * @returns {Promise<Object|null>} User profile or null if not found
 */
const getUserProfileByUid = async (uid) => {
  try {
    const result = await query(
      `SELECT id, firebase_uid, email, name, phone, profile_pic, created_at, updated_at
       FROM owners WHERE firebase_uid = $1`,
      [uid],
    );
    return result.rows[0] || null;
  } catch (err) {
    throw new AppError("Failed to fetch user profile", 500);
  }
};

/**
 * Update user profile photo URL
 *
 * @param {string} uid - Firebase UID
 * @param {string} profilePicUrl - Firebase Storage signed URL
 * @returns {Promise<Object>} Updated profile
 */
const updateProfilePicture = async (uid, profilePicUrl) => {
  try {
    const result = await query(
      `UPDATE owners 
       SET profile_pic = $1, updated_at = NOW()
       WHERE firebase_uid = $2
       RETURNING id, firebase_uid, email, name, phone, profile_pic, created_at, updated_at`,
      [profilePicUrl, uid],
    );

    if (result.rows.length === 0) {
      throw new AppError("User profile not found", 404);
    }

    return result.rows[0];
  } catch (err) {
    throw new AppError("Failed to update profile picture", 500);
  }
};

/**
 * Get user profile with stats (buildings, tenants, units)
 *
 * @param {string} uid - Firebase UID
 * @returns {Promise<Object>} User profile with stats
 */
const getUserProfileWithStats = async (uid) => {
  try {
    const userResult = await query(
      `SELECT id, firebase_uid, email, name, phone, profile_pic, created_at, updated_at
       FROM owners WHERE firebase_uid = $1`,
      [uid],
    );

    if (userResult.rows.length === 0) {
      throw new AppError("User profile not found", 404);
    }

    const ownerId = userResult.rows[0].id;

    // Get stats
    const statsResult = await query(
      `SELECT
         COUNT(DISTINCT b.id) AS total_buildings,
         COUNT(DISTINCT u.id) AS total_units,
         COUNT(DISTINCT CASE WHEN u.status = 'occupied' THEN u.id END) AS occupied_units,
         COUNT(DISTINCT CASE WHEN t.is_active THEN t.id END) AS active_tenants
       FROM buildings b
       LEFT JOIN units u    ON u.building_id = b.id
       LEFT JOIN tenants t  ON t.unit_id = u.id
       WHERE b.owner_id = $1`,
      [ownerId],
    );

    return {
      ...userResult.rows[0],
      stats: statsResult.rows[0],
    };
  } catch (err) {
    throw new AppError("Failed to fetch user profile with stats", 500);
  }
};

module.exports = {
  createOrUpdateUserProfile,
  getUserProfileByUid,
  updateProfilePicture,
  getUserProfileWithStats,
};
