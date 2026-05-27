/**
 * @file routes/unitRoutes.js
 * @description Unit/home management routes — nested under buildings.
 * All routes are protected and prefixed with /api/buildings/:buildingId/units
 */

const express = require('express');
const { body } = require('express-validator');
const {
  getUnits,
  getUnitById,
  createUnit,
  updateUnit,
  deleteUnit,
} = require('../controllers/unitController');
const { protect } = require('../middleware/auth');

// mergeParams: true allows access to :buildingId from the parent router
const router = express.Router({ mergeParams: true });

router.use(protect);

// ── Validation ────────────────────────────────────────────────────────────────

const unitValidation = [
  body('unit_number').trim().notEmpty().withMessage('Unit number is required'),
  body('floor_number')
    .isInt({ min: 0 }).withMessage('Floor number must be a non-negative integer'),
  body('rent_amount')
    .isFloat({ min: 0 }).withMessage('Rent amount must be a positive number'),
  body('unit_type')
    .optional()
    .isIn(['Studio','1BHK','2BHK','3BHK','4BHK','Villa','Shop','Office'])
    .withMessage('Invalid unit type'),
  body('status')
    .optional()
    .isIn(['vacant','occupied','maintenance'])
    .withMessage('Status must be: vacant, occupied, or maintenance'),
];

// ── Routes with Swagger Docs ──────────────────────────────────────────────────

/**
 * @swagger
 * tags:
 *   name: Units
 *   description: Manage units/homes inside a building, organized by floor
 */

/**
 * @swagger
 * /api/buildings/{buildingId}/units:
 *   get:
 *     summary: Get all units in a building
 *     tags: [Units]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: buildingId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: floor
 *         schema: { type: integer }
 *         description: Filter units by floor number
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [vacant, occupied, maintenance] }
 *         description: Filter by unit status
 *     responses:
 *       200:
 *         description: List of units with tenant info (if occupied)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 count:   { type: integer }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Unit' }
 */
router.get('/', getUnits);

/**
 * @swagger
 * /api/buildings/{buildingId}/units/{id}:
 *   get:
 *     summary: Get a specific unit with tenant and current rent status
 *     tags: [Units]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: buildingId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Unit details with tenant and rent info
 *       404:
 *         description: Unit not found
 */
router.get('/:id', getUnitById);

/**
 * @swagger
 * /api/buildings/{buildingId}/units:
 *   post:
 *     summary: Add a new unit/home to a building
 *     tags: [Units]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: buildingId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [unit_number, floor_number, rent_amount]
 *             properties:
 *               unit_number:    { type: string, example: '101' }
 *               floor_number:   { type: integer, example: 1 }
 *               unit_type:      { type: string, example: '2BHK' }
 *               area_sqft:      { type: number, example: 850 }
 *               rent_amount:    { type: number, example: 15000 }
 *               deposit_amount: { type: number, example: 30000 }
 *               is_furnished:   { type: boolean, example: false }
 *     responses:
 *       201:
 *         description: Unit created
 *       400:
 *         description: Validation error or floor exceeds building total
 */
router.post('/', unitValidation, createUnit);

/**
 * @swagger
 * /api/buildings/{buildingId}/units/{id}:
 *   put:
 *     summary: Update unit details (rent amount, type, status)
 *     tags: [Units]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: buildingId
 *         required: true
 *         schema: { type: string, format: uuid }
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
 *               rent_amount:    { type: number }
 *               deposit_amount: { type: number }
 *               unit_type:      { type: string }
 *               is_furnished:   { type: boolean }
 *               status:         { type: string, enum: [vacant, occupied, maintenance] }
 *     responses:
 *       200:
 *         description: Unit updated
 *       404:
 *         description: Unit not found
 */
router.put('/:id', updateUnit);

/**
 * @swagger
 * /api/buildings/{buildingId}/units/{id}:
 *   delete:
 *     summary: Delete a vacant unit
 *     tags: [Units]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: buildingId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Unit deleted
 *       400:
 *         description: Cannot delete — unit has active tenant
 *       404:
 *         description: Unit not found
 */
router.delete('/:id', deleteUnit);

module.exports = router;
