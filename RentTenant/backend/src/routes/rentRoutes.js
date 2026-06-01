/**
 * @file routes/rentRoutes.js
 * @description Rent record management routes.
 * Prefixed with /api/rents (see routes/index.js)
 */

const express = require('express');
const { body, query: queryValidator } = require('express-validator');
const {
  getRentByTenant,
  getPendingRents,
  createRentRecord,
  markRentPaid,
  markOverdueRents,
  getRentReport,
} = require('../controllers/rentController');
const { protectOwner } = require('../middleware/firebaseAuth');

const router = express.Router();
router.use(protectOwner);

// ── Validation ────────────────────────────────────────────────────────────────

const createRentValidation = [
  body('tenant_id').isUUID().withMessage('Valid tenant_id is required'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be 1-12'),
  body('year').isInt({ min: 2000 }).withMessage('Valid year is required'),
  body('due_date').isDate().withMessage('Valid due_date (YYYY-MM-DD) is required'),
  body('amount_due').isFloat({ min: 0 }).withMessage('amount_due must be a positive number'),
];

const markPaidValidation = [
  body('payment_mode')
    .optional()
    .isIn(['Cash','UPI','Bank Transfer','Cheque','NEFT','IMPS'])
    .withMessage('Invalid payment mode'),
];

// ── Routes with Swagger Docs ──────────────────────────────────────────────────

/**
 * @swagger
 * tags:
 *   name: Rent
 *   description: Monthly rent records — create, pay, and report
 */

/**
 * @swagger
 * /api/rents/pending:
 *   get:
 *     summary: Get all pending and overdue rents across all buildings
 *     tags: [Rent]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of unpaid rent records with tenant and building info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 count:   { type: integer }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/RentRecord' }
 */
router.get('/pending', getPendingRents);

/**
 * @swagger
 * /api/rents/report:
 *   get:
 *     summary: Monthly income report grouped by building
 *     tags: [Rent]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: integer, minimum: 1, maximum: 12 }
 *         description: Month (1-12), defaults to current month
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *         description: Year, defaults to current year
 *     responses:
 *       200:
 *         description: Monthly rent report per building with totals
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:   { type: boolean }
 *                 period:    { type: object, properties: { month: {type: integer}, year: {type: integer} } }
 *                 buildings: { type: array, items: { type: object } }
 *                 totals:    { type: object }
 */
router.get('/report', getRentReport);

/**
 * @swagger
 * /api/rents/tenant/{tenantId}:
 *   get:
 *     summary: Get rent history for a specific tenant
 *     tags: [Rent]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, paid, overdue, waived] }
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Rent records with payment summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/RentRecord' }
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total_due:      { type: number }
 *                     total_paid:     { type: number }
 *                     pending_count:  { type: integer }
 *                     overdue_count:  { type: integer }
 */
router.get('/tenant/:tenantId', getRentByTenant);

/**
 * @swagger
 * /api/rents:
 *   post:
 *     summary: Create a rent record for a tenant (a specific month)
 *     tags: [Rent]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tenant_id, month, year, due_date, amount_due]
 *             properties:
 *               tenant_id:  { type: string, format: uuid }
 *               month:      { type: integer, minimum: 1, maximum: 12, example: 6 }
 *               year:       { type: integer, example: 2024 }
 *               due_date:   { type: string, format: date, example: '2024-06-01' }
 *               amount_due: { type: number, example: 15000 }
 *     responses:
 *       201:
 *         description: Rent record created
 *       409:
 *         description: Record already exists for this month
 */
router.post('/', createRentValidation, createRentRecord);

/**
 * @swagger
 * /api/rents/{id}/pay:
 *   put:
 *     summary: Mark a rent record as paid
 *     tags: [Rent]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Rent record UUID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount_paid:     { type: number, example: 15000 }
 *               payment_mode:    { type: string, enum: [Cash, UPI, Bank Transfer, Cheque, NEFT, IMPS], example: UPI }
 *               transaction_ref: { type: string, example: 'UPI123456' }
 *               paid_date:       { type: string, format: date, example: '2024-06-03' }
 *               notes:           { type: string }
 *     responses:
 *       200:
 *         description: Rent marked as paid
 *       404:
 *         description: Rent record not found
 */
router.put('/:id/pay', markPaidValidation, markRentPaid);

/**
 * @swagger
 * /api/rents/mark-overdue:
 *   post:
 *     summary: Mark all past-due pending rents as overdue
 *     description: Run manually or triggered automatically by the nightly cron job
 *     tags: [Rent]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Number of records updated to overdue
 */
router.post('/mark-overdue', markOverdueRents);

module.exports = router;
