/**
 * @file controllers/unitController.js
 * @description CRUD operations for units/homes within a building.
 * Units sit on floors and hold one active tenant at a time.
 */

const { query }    = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

/**
 * @desc   Get all units for a building (with optional floor filter)
 * @route  GET /api/buildings/:buildingId/units
 * @access Protected
 */
const getUnits = async (req, res, next) => {
  try {
    const { buildingId } = req.params;
    const { floor, status } = req.query;

    // Verify the building belongs to the logged-in owner
    const buildingCheck = await query(
      'SELECT id FROM buildings WHERE id = $1 AND owner_id = $2',
      [buildingId, req.owner.id]
    );
    if (buildingCheck.rows.length === 0) {
      throw new AppError('Building not found.', 404);
    }

    // Build dynamic WHERE clause based on optional filters
    let whereClause = 'WHERE u.building_id = $1';
    const values    = [buildingId];
    let idx         = 2;

    if (floor) {
      whereClause += ` AND u.floor_number = $${idx++}`;
      values.push(parseInt(floor));
    }
    if (status) {
      whereClause += ` AND u.status = $${idx++}`;
      values.push(status);
    }

    const result = await query(
      `SELECT
         u.*,
         t.id           AS tenant_id,
         t.name         AS tenant_name,
         t.phone        AS tenant_phone,
         t.move_in_date AS tenant_move_in
       FROM units u
       LEFT JOIN tenants t ON t.unit_id = u.id AND t.is_active = TRUE
       ${whereClause}
       ORDER BY u.floor_number ASC, u.unit_number ASC`,
      values
    );

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Get a single unit by ID with tenant and rent info
 * @route  GET /api/buildings/:buildingId/units/:id
 * @access Protected
 */
const getUnitById = async (req, res, next) => {
  try {
    const { buildingId, id } = req.params;

    // Join unit with active tenant and latest rent record
    const result = await query(
      `SELECT
         u.*,
         t.id                    AS tenant_id,
         t.name                  AS tenant_name,
         t.email                 AS tenant_email,
         t.phone                 AS tenant_phone,
         t.move_in_date,
         t.photo_url             AS tenant_photo,
         r.amount_due            AS current_rent_due,
         r.status                AS current_rent_status,
         r.due_date              AS current_rent_due_date
       FROM units u
       LEFT JOIN tenants t     ON t.unit_id = u.id AND t.is_active = TRUE
       LEFT JOIN rent_records r
         ON r.tenant_id = t.id
         AND r.month = EXTRACT(MONTH FROM CURRENT_DATE)
         AND r.year  = EXTRACT(YEAR  FROM CURRENT_DATE)
       WHERE u.id = $1 AND u.building_id = $2`,
      [id, buildingId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Unit not found.', 404);
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Create a new unit/home in a building
 * @route  POST /api/buildings/:buildingId/units
 * @access Protected
 */
const createUnit = async (req, res, next) => {
  try {
    const { buildingId } = req.params;
    const {
      unit_number,
      floor_number,
      unit_type,
      area_sqft,
      rent_amount,
      deposit_amount,
      is_furnished,
    } = req.body;

    // Verify building ownership
    const buildingCheck = await query(
      'SELECT id, total_floors FROM buildings WHERE id = $1 AND owner_id = $2',
      [buildingId, req.owner.id]
    );
    if (buildingCheck.rows.length === 0) {
      throw new AppError('Building not found.', 404);
    }

    // Validate floor_number doesn't exceed building's total_floors
    const { total_floors } = buildingCheck.rows[0];
    if (parseInt(floor_number) > total_floors) {
      throw new AppError(
        `Floor ${floor_number} exceeds building's total floors (${total_floors}).`,
        400
      );
    }

    const result = await query(
      `INSERT INTO units
         (building_id, unit_number, floor_number, unit_type, area_sqft,
          rent_amount, deposit_amount, is_furnished)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        buildingId,
        unit_number.trim(),
        parseInt(floor_number),
        unit_type || '1BHK',
        area_sqft ? parseFloat(area_sqft) : null,
        parseFloat(rent_amount),
        deposit_amount ? parseFloat(deposit_amount) : 0,
        is_furnished === 'true' || is_furnished === true,
      ]
    );

    res.status(201).json({
      success: true,
      message: `Unit ${unit_number} created successfully.`,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Update unit details (e.g., rent amount, furnishing)
 * @route  PUT /api/buildings/:buildingId/units/:id
 * @access Protected
 */
const updateUnit = async (req, res, next) => {
  try {
    const { buildingId, id } = req.params;
    const {
      unit_number,
      floor_number,
      unit_type,
      area_sqft,
      rent_amount,
      deposit_amount,
      is_furnished,
      status,
    } = req.body;

    // Ensure unit belongs to this owner's building
    const existing = await query(
      `SELECT u.* FROM units u
       JOIN buildings b ON b.id = u.building_id
       WHERE u.id = $1 AND u.building_id = $2 AND b.owner_id = $3`,
      [id, buildingId, req.owner.id]
    );

    if (existing.rows.length === 0) {
      throw new AppError('Unit not found.', 404);
    }

    // COALESCE: use new value if provided, otherwise keep existing
    const result = await query(
      `UPDATE units SET
         unit_number    = COALESCE($1, unit_number),
         floor_number   = COALESCE($2, floor_number),
         unit_type      = COALESCE($3, unit_type),
         area_sqft      = COALESCE($4, area_sqft),
         rent_amount    = COALESCE($5, rent_amount),
         deposit_amount = COALESCE($6, deposit_amount),
         is_furnished   = COALESCE($7, is_furnished),
         status         = COALESCE($8, status)
       WHERE id = $9
       RETURNING *`,
      [
        unit_number?.trim()             || null,
        floor_number ? parseInt(floor_number) : null,
        unit_type                       || null,
        area_sqft ? parseFloat(area_sqft) : null,
        rent_amount ? parseFloat(rent_amount) : null,
        deposit_amount !== undefined ? parseFloat(deposit_amount) : null,
        is_furnished !== undefined ? (is_furnished === 'true' || is_furnished === true) : null,
        status                          || null,
        id,
      ]
    );

    res.status(200).json({
      success: true,
      message: 'Unit updated successfully.',
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Delete a unit (only if it's vacant — no active tenant)
 * @route  DELETE /api/buildings/:buildingId/units/:id
 * @access Protected
 */
const deleteUnit = async (req, res, next) => {
  try {
    const { buildingId, id } = req.params;

    // Block deletion if unit has an active tenant
    const tenantCheck = await query(
      'SELECT id FROM tenants WHERE unit_id = $1 AND is_active = TRUE',
      [id]
    );

    if (tenantCheck.rows.length > 0) {
      throw new AppError(
        'Cannot delete unit with an active tenant. Move out the tenant first.',
        400
      );
    }

    const result = await query(
      `DELETE FROM units
       WHERE id = $1 AND building_id = $2
       RETURNING unit_number`,
      [id, buildingId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Unit not found.', 404);
    }

    res.status(200).json({
      success: true,
      message: `Unit ${result.rows[0].unit_number} deleted successfully.`,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getUnits, getUnitById, createUnit, updateUnit, deleteUnit };
