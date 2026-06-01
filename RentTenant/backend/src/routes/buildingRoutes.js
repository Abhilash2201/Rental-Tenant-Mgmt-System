/**
 * @file routes/buildingRoutes.js
 * @description Building management routes.
 * All routes require JWT authentication (protected).
 * Prefixed with /api/buildings (see routes/index.js)
 */

const express = require('express');
const { body } = require('express-validator');

const {
  getAllBuildings,
  getBuildingById,
  createBuilding,
  updateBuilding,
  deletePhoto,
  deleteBuilding,
} = require('../controllers/buildingController');

const { protectOwner } = require('../middleware/firebaseAuth');
const { upload }       = require('../middleware/upload');

const router = express.Router();

// All building routes require authentication
router.use(protectOwner);

// ── Validation ────────────────────────────────────────────────────────────────

const buildingValidation = [
  body('name').trim().notEmpty().withMessage('Building name is required'),
  body('address_line1').trim().notEmpty().withMessage('Address line 1 is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('pincode')
    .trim()
    .notEmpty().withMessage('Pincode is required')
    .isLength({ min: 5, max: 10 }).withMessage('Invalid pincode'),
  body('total_floors')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('total_floors must be between 1 and 100'),
];

// ── Routes with Swagger Docs ──────────────────────────────────────────────────

/**
 * @swagger
 * tags:
 *   name: Buildings
 *   description: Manage your rental buildings and their photos
 */

/**
 * @swagger
 * /api/buildings:
 *   get:
 *     summary: Get all buildings for the logged-in owner
 *     tags: [Buildings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *         description: Results per page
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Filter by building name or city
 *     responses:
 *       200:
 *         description: List of buildings with occupancy stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Building' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *       401:
 *         description: Unauthorized
 */
router.get('/', getAllBuildings);

/**
 * @swagger
 * /api/buildings/{id}:
 *   get:
 *     summary: Get a single building with all floors and units
 *     tags: [Buildings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Building UUID
 *     responses:
 *       200:
 *         description: Building detail with units grouped by floor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Building'
 *                     - type: object
 *                       properties:
 *                         floors:
 *                           type: object
 *                           description: "Units grouped by floor number. Key = floor number."
 *       404:
 *         description: Building not found
 */
router.get('/:id', getBuildingById);

/**
 * @swagger
 * /api/buildings:
 *   post:
 *     summary: Add a new building with address and photos
 *     tags: [Buildings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, address_line1, city, state, pincode]
 *             properties:
 *               name:           { type: string, example: 'Sunshine Apartments' }
 *               address_line1:  { type: string, example: '12 MG Road' }
 *               address_line2:  { type: string, example: 'Near City Mall' }
 *               city:           { type: string, example: 'Bangalore' }
 *               state:          { type: string, example: 'Karnataka' }
 *               pincode:        { type: string, example: '560001' }
 *               total_floors:   { type: integer, example: 5 }
 *               description:    { type: string }
 *               photos:
 *                 type: array
 *                 items: { type: string, format: binary }
 *                 description: Up to 5 building photos
 *     responses:
 *       201:
 *         description: Building created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:    { $ref: '#/components/schemas/Building' }
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/',
  upload.array('photos', 5),
  buildingValidation,
  createBuilding
);

/**
 * @swagger
 * /api/buildings/{id}:
 *   put:
 *     summary: Update building details or add more photos
 *     tags: [Buildings]
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
 *               name:          { type: string }
 *               address_line1: { type: string }
 *               city:          { type: string }
 *               state:         { type: string }
 *               pincode:       { type: string }
 *               total_floors:  { type: integer }
 *               description:   { type: string }
 *               photos:
 *                 type: array
 *                 items: { type: string, format: binary }
 *                 description: Additional photos to append
 *     responses:
 *       200:
 *         description: Building updated
 *       404:
 *         description: Building not found
 */
router.put('/:id', upload.array('photos', 5), updateBuilding);

/**
 * @swagger
 * /api/buildings/{id}/photos:
 *   delete:
 *     summary: Remove a specific photo from a building
 *     tags: [Buildings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [photo_url]
 *             properties:
 *               photo_url: { type: string, example: 'https://res.cloudinary.com/...' }
 *     responses:
 *       200:
 *         description: Photo removed
 *       404:
 *         description: Building not found
 */
router.delete('/:id/photos', deletePhoto);

/**
 * @swagger
 * /api/buildings/{id}:
 *   delete:
 *     summary: Delete a building and all its units, tenants, and records
 *     tags: [Buildings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Building deleted
 *       404:
 *         description: Building not found
 */
router.delete('/:id', deleteBuilding);

module.exports = router;
