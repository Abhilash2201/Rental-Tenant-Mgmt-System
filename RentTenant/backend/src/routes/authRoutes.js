/**
 * @file routes/authRoutes.js
 * @description Authentication routes for property owner accounts.
 * All routes are prefixed with /api/auth (see routes/index.js)
 */

const express = require('express');
const { body } = require('express-validator');

const {
  register,
  login,
  getMe,
  updateMe,
  changePassword,
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');
const { upload }  = require('../middleware/upload');

const router = express.Router();

// ── Validation Rules ─────────────────────────────────────────────────────────

/** Validation chain for registration input */
const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email')
    .isEmail().withMessage('Valid email is required')
    .normalizeEmail(),
  body('phone')
    .isMobilePhone('any').withMessage('Valid phone number is required'),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

/** Validation chain for login input */
const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

/** Validation chain for password change */
const changePasswordValidation = [
  body('current_password').notEmpty().withMessage('Current password is required'),
  body('new_password')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
    .custom((val, { req }) => {
      if (val === req.body.current_password) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),
];

// ── Routes with Swagger Docs ─────────────────────────────────────────────────

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Owner authentication — register, login, and profile management
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new property owner account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterInput'
 *     responses:
 *       201:
 *         description: Account created. Returns JWT token + owner profile.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Email already registered
 */
router.post('/register', registerValidation, register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login to get a JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginInput'
 *     responses:
 *       200:
 *         description: Login successful. Returns JWT token + owner profile.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', loginValidation, login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get the logged-in owner's profile + dashboard stats
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Owner profile with building/tenant stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 owner:   { $ref: '#/components/schemas/Owner' }
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total_buildings: { type: integer }
 *                     total_units:     { type: integer }
 *                     occupied_units:  { type: integer }
 *                     active_tenants:  { type: integer }
 *       401:
 *         description: Unauthorized — missing or invalid token
 */
router.get('/me', protect, getMe);

/**
 * @swagger
 * /api/auth/me:
 *   put:
 *     summary: Update owner profile (name, phone, profile photo)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:        { type: string }
 *               phone:       { type: string }
 *               profile_pic: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Unauthorized
 */
router.put('/me', protect, upload.single('profile_pic'), updateMe);

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Change the owner's password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [current_password, new_password]
 *             properties:
 *               current_password: { type: string, example: 'oldpass123' }
 *               new_password:     { type: string, example: 'newpass456', minLength: 6 }
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Current password incorrect or validation error
 *       401:
 *         description: Unauthorized
 */
router.put('/change-password', protect, changePasswordValidation, changePassword);

module.exports = router;
