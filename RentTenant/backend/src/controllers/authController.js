/**
 * @file controllers/authController.js
 * @description Authentication controller for property owner accounts.
 * Handles: Register, Login, Get Profile, Update Profile, Change Password
 */

const bcrypt   = require('bcryptjs');
const { query } = require('../config/db');
const { generateToken } = require('../middleware/auth');
const { AppError }      = require('../middleware/errorHandler');
const { validationResult } = require('express-validator');

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
    const err = new AppError('Validation failed', 400);
    err.errors = errors.array();
    throw err;
  }
};

// ── Controllers ──────────────────────────────────────────────────────────────

/**
 * @desc   Register a new property owner
 * @route  POST /api/auth/register
 * @access Public
 */
const register = async (req, res, next) => {
  try {
    checkValidation(req);

    const { name, email, phone, password } = req.body;

    // ── Check if email already registered ──────────────────────────────────
    const existing = await query(
      'SELECT id FROM owners WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      throw new AppError('An account with this email already exists.', 409);
    }

    // ── Hash password before storing ────────────────────────────────────────
    // bcrypt salt rounds: 12 is a good balance between security and speed
    const hashedPassword = await bcrypt.hash(password, 12);

    // ── Insert new owner ────────────────────────────────────────────────────
    const result = await query(
      `INSERT INTO owners (name, email, phone, password)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, phone, profile_pic, created_at`,
      [name.trim(), email.toLowerCase().trim(), phone.trim(), hashedPassword]
    );

    const owner = result.rows[0];

    // ── Generate JWT token ──────────────────────────────────────────────────
    const token = generateToken({
      id:    owner.id,
      email: owner.email,
      name:  owner.name,
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully! Welcome to Rent Manager.',
      token,
      owner,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Login an existing owner
 * @route  POST /api/auth/login
 * @access Public
 */
const login = async (req, res, next) => {
  try {
    checkValidation(req);

    const { email, password } = req.body;

    // ── Fetch owner by email ────────────────────────────────────────────────
    const result = await query(
      'SELECT * FROM owners WHERE email = $1',
      [email.toLowerCase()]
    );

    const owner = result.rows[0];

    // Generic message: don't reveal whether email exists or password is wrong
    const invalidMsg = 'Invalid email or password.';

    if (!owner) {
      throw new AppError(invalidMsg, 401);
    }

    // ── Verify password ─────────────────────────────────────────────────────
    const isMatch = await bcrypt.compare(password, owner.password);
    if (!isMatch) {
      throw new AppError(invalidMsg, 401);
    }

    // ── Generate JWT token ──────────────────────────────────────────────────
    const token = generateToken({
      id:    owner.id,
      email: owner.email,
      name:  owner.name,
    });

    // Strip password from response
    const { password: _pwd, ...ownerData } = owner;

    res.status(200).json({
      success: true,
      message: `Welcome back, ${owner.name}!`,
      token,
      owner: ownerData,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Get the currently logged-in owner's profile
 * @route  GET /api/auth/me
 * @access Protected (requires JWT)
 */
const getMe = async (req, res, next) => {
  try {
    // req.owner is set by the `protect` middleware from the JWT payload
    const result = await query(
      `SELECT id, name, email, phone, profile_pic, created_at, updated_at
       FROM owners WHERE id = $1`,
      [req.owner.id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Owner account not found.', 404);
    }

    // Attach summary stats to the profile response
    const stats = await query(
      `SELECT
         COUNT(DISTINCT b.id) AS total_buildings,
         COUNT(DISTINCT u.id) AS total_units,
         COUNT(DISTINCT CASE WHEN u.status = 'occupied' THEN u.id END) AS occupied_units,
         COUNT(DISTINCT CASE WHEN t.is_active THEN t.id END) AS active_tenants
       FROM buildings b
       LEFT JOIN units u    ON u.building_id = b.id
       LEFT JOIN tenants t  ON t.unit_id = u.id
       WHERE b.owner_id = $1`,
      [req.owner.id]
    );

    res.status(200).json({
      success: true,
      owner: result.rows[0],
      stats: stats.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Update owner profile (name, phone, profile_pic)
 * @route  PUT /api/auth/me
 * @access Protected
 */
const updateMe = async (req, res, next) => {
  try {
    const { name, phone } = req.body;

    // If a profile_pic was uploaded via multer, use its Cloudinary URL
    const profile_pic = req.file ? req.file.path : undefined;

    // Build dynamic update — only update fields that were provided
    const fields = [];
    const values = [];
    let idx = 1;

    if (name)        { fields.push(`name = $${idx++}`);        values.push(name.trim()); }
    if (phone)       { fields.push(`phone = $${idx++}`);       values.push(phone.trim()); }
    if (profile_pic) { fields.push(`profile_pic = $${idx++}`); values.push(profile_pic); }

    if (fields.length === 0) {
      throw new AppError('No fields provided to update.', 400);
    }

    values.push(req.owner.id); // Last value = WHERE clause

    const result = await query(
      `UPDATE owners SET ${fields.join(', ')}
       WHERE id = $${idx}
       RETURNING id, name, email, phone, profile_pic, updated_at`,
      values
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      owner: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Change password
 * @route  PUT /api/auth/change-password
 * @access Protected
 */
const changePassword = async (req, res, next) => {
  try {
    checkValidation(req);

    const { current_password, new_password } = req.body;

    // Fetch current hashed password
    const result = await query(
      'SELECT password FROM owners WHERE id = $1',
      [req.owner.id]
    );

    const isMatch = await bcrypt.compare(current_password, result.rows[0].password);
    if (!isMatch) {
      throw new AppError('Current password is incorrect.', 400);
    }

    // Hash and save new password
    const newHashed = await bcrypt.hash(new_password, 12);

    await query(
      'UPDATE owners SET password = $1 WHERE id = $2',
      [newHashed, req.owner.id]
    );

    res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please login again.',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe, updateMe, changePassword };
