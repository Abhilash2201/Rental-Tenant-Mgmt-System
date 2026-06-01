/**
 * @file routes/tenantRoutes.js
 * @description Tenant management routes.
 * Prefixed with /api/tenants (see routes/index.js)
 */

const express = require('express');
const { body } = require('express-validator');
const {
  getAllTenants,
  getTenantById,
  createTenant,
  updateTenant,
  moveTenantOut,
} = require('../controllers/tenantController');
const { protectOwner } = require('../middleware/firebaseAuth');
const { upload }       = require('../middleware/upload');

const router = express.Router();
router.use(protectOwner);

// ── Validation ────────────────────────────────────────────────────────────────

const createTenantValidation = [
  body('unit_id').isUUID().withMessage('Valid unit_id (UUID) is required'),
  body('name').trim().notEmpty().withMessage('Tenant name is required'),
  body('phone').isMobilePhone('any').withMessage('Valid phone number is required'),
  body('move_in_date').isDate().withMessage('Valid move_in_date (YYYY-MM-DD) is required'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
];

// ── Routes with Swagger Docs ──────────────────────────────────────────────────

/**
 * @swagger
 * tags:
 *   name: Tenants
 *   description: Manage tenants — add, view, update, and move out tenants
 */

/**
 * @swagger
 * /api/tenants:
 *   get:
 *     summary: Get all tenants (across all buildings)
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: active
 *         schema: { type: boolean }
 *         description: Filter by active status (true = current tenants)
 *       - in: query
 *         name: building_id
 *         schema: { type: string, format: uuid }
 *         description: Filter by specific building
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: List of tenants with building, unit, and agreement info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Tenant' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 */
router.get('/', getAllTenants);

/**
 * @swagger
 * /api/tenants/{id}:
 *   get:
 *     summary: Get full tenant profile with agreement, rent history, and reminders
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Full tenant details
 *       404:
 *         description: Tenant not found
 */
router.get('/:id', getTenantById);

/**
 * @swagger
 * /api/tenants:
 *   post:
 *     summary: Add a new tenant to a unit
 *     description: |
 *       Creates the tenant, then automatically generates:
 *       - ✅ 2-year rent agreement
 *       - ✅ First month's rent record (pending)
 *       - ✅ 3 reminders: rent_due, rent_increment (11mo), agreement_renewal (2yr)
 *       - ✅ Marks unit as occupied
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [unit_id, name, phone, move_in_date]
 *             properties:
 *               unit_id:                 { type: string, format: uuid }
 *               name:                    { type: string, example: 'Suresh Patel' }
 *               email:                   { type: string, format: email }
 *               phone:                   { type: string, example: '9123456780' }
 *               alternate_phone:         { type: string }
 *               id_proof_type:           { type: string, example: 'Aadhaar' }
 *               id_proof_number:         { type: string, example: '1234 5678 9012' }
 *               emergency_contact_name:  { type: string }
 *               emergency_contact_phone: { type: string }
 *               move_in_date:            { type: string, format: date, example: '2024-06-01' }
 *               photo:                   { type: string, format: binary, description: 'Tenant photo' }
 *               id_proof:                { type: string, format: binary, description: 'ID proof document (PDF/image)' }
 *     responses:
 *       201:
 *         description: Tenant added with agreement and reminders
 *       400:
 *         description: Validation error or unit already occupied
 *       404:
 *         description: Unit not found
 */
router.post(
  '/',
  upload.fields([
    { name: 'photo',    maxCount: 1 },
    { name: 'id_proof', maxCount: 1 },
  ]),
  createTenantValidation,
  createTenant
);

/**
 * @swagger
 * /api/tenants/{id}:
 *   put:
 *     summary: Update tenant profile details
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:                    { type: string }
 *               email:                   { type: string }
 *               phone:                   { type: string }
 *               id_proof_type:           { type: string }
 *               id_proof_number:         { type: string }
 *               emergency_contact_name:  { type: string }
 *               emergency_contact_phone: { type: string }
 *               photo:                   { type: string, format: binary }
 *               id_proof:                { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Tenant updated
 *       404:
 *         description: Tenant not found
 */
router.put(
  '/:id',
  upload.fields([
    { name: 'photo',    maxCount: 1 },
    { name: 'id_proof', maxCount: 1 },
  ]),
  updateTenant
);

/**
 * @swagger
 * /api/tenants/{id}/move-out:
 *   put:
 *     summary: Move out a tenant — marks unit as vacant and terminates agreement
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               move_out_date: { type: string, format: date, example: '2025-05-31' }
 *               notes:         { type: string }
 *     responses:
 *       200:
 *         description: Tenant moved out, unit marked vacant
 *       404:
 *         description: Active tenant not found
 */
router.put('/:id/move-out', moveTenantOut);

module.exports = router;
