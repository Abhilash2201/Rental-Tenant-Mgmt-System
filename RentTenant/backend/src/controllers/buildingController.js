/**
 * @file controllers/buildingController.js
 * @description CRUD operations for buildings owned by the logged-in owner.
 * Each building has an address, multiple photos, floors, and units.
 */

const { query }    = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { deleteFromCloudinary, getPublicIdFromUrl } = require('../middleware/upload');

// ── Controller Functions ──────────────────────────────────────────────────────

/**
 * @desc   Get all buildings for the logged-in owner (with occupancy stats)
 * @route  GET /api/buildings
 * @access Protected
 */
const getAllBuildings = async (req, res, next) => {
  try {
    // Pagination query params (default: page 1, limit 10)
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Optional search filter by building name or city
    const search = req.query.search ? `%${req.query.search}%` : null;

    // ── Count total buildings ───────────────────────────────────────────────
    const countResult = await query(
      `SELECT COUNT(*) FROM buildings
       WHERE owner_id = $1
       ${search ? 'AND (name ILIKE $2 OR city ILIKE $2)' : ''}`,
      search ? [req.owner.id, search] : [req.owner.id]
    );

    const total = parseInt(countResult.rows[0].count);

    // ── Fetch buildings with unit/occupancy stats ───────────────────────────
    const result = await query(
      `SELECT
         b.*,
         COUNT(u.id)                                         AS total_units,
         COUNT(CASE WHEN u.status = 'occupied' THEN 1 END)  AS occupied_units,
         COUNT(CASE WHEN u.status = 'vacant' THEN 1 END)    AS vacant_units
       FROM buildings b
       LEFT JOIN units u ON u.building_id = b.id
       WHERE b.owner_id = $1
       ${search ? 'AND (b.name ILIKE $4 OR b.city ILIKE $4)' : ''}
       GROUP BY b.id
       ORDER BY b.created_at DESC
       LIMIT $2 OFFSET $3`,
      search
        ? [req.owner.id, limit, offset, search]
        : [req.owner.id, limit, offset]
    );

    res.status(200).json({
      success: true,
      data: result.rows,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Get a single building with full details (floors, units)
 * @route  GET /api/buildings/:id
 * @access Protected
 */
const getBuildingById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Fetch building (owner_id check prevents accessing another owner's data)
    const buildingResult = await query(
      `SELECT b.*,
         COUNT(DISTINCT u.id)                                        AS total_units,
         COUNT(DISTINCT CASE WHEN u.status = 'occupied' THEN u.id END) AS occupied_units
       FROM buildings b
       LEFT JOIN units u ON u.building_id = b.id
       WHERE b.id = $1 AND b.owner_id = $2
       GROUP BY b.id`,
      [id, req.owner.id]
    );

    if (buildingResult.rows.length === 0) {
      throw new AppError('Building not found.', 404);
    }

    // Fetch all units for this building, grouped by floor
    const unitsResult = await query(
      `SELECT u.*,
         t.name        AS tenant_name,
         t.phone       AS tenant_phone,
         t.is_active   AS tenant_active,
         t.move_in_date
       FROM units u
       LEFT JOIN tenants t ON t.unit_id = u.id AND t.is_active = TRUE
       WHERE u.building_id = $1
       ORDER BY u.floor_number, u.unit_number`,
      [id]
    );

    // Group units by floor for easy rendering on frontend
    const unitsByFloor = unitsResult.rows.reduce((acc, unit) => {
      const floor = unit.floor_number;
      if (!acc[floor]) acc[floor] = [];
      acc[floor].push(unit);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        ...buildingResult.rows[0],
        floors: unitsByFloor,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Create a new building with optional photos
 * @route  POST /api/buildings
 * @access Protected
 * @upload photos (up to 5 images via multipart/form-data)
 */
const createBuilding = async (req, res, next) => {
  try {
    const {
      name,
      address_line1,
      address_line2,
      city,
      state,
      pincode,
      total_floors,
      description,
    } = req.body;

    const photos = req.files ? req.files.map((f) => f.path) : [];

    const result = await query(
      `INSERT INTO buildings
         (owner_id, name, address_line1, address_line2, city, state, pincode, total_floors, description, photos)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        req.owner.id,
        name.trim(),
        address_line1.trim(),
        address_line2?.trim() || null,
        city.trim(),
        state.trim(),
        pincode.trim(),
        total_floors || 1,
        description?.trim() || null,
        photos,
      ]
    );

    res.status(201).json({
      success: true,
      message: `Building "${name}" created successfully.`,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Update building details / add/replace photos
 * @route  PUT /api/buildings/:id
 * @access Protected
 */
const updateBuilding = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Ensure building belongs to this owner
    const existing = await query(
      'SELECT * FROM buildings WHERE id = $1 AND owner_id = $2',
      [id, req.owner.id]
    );

    if (existing.rows.length === 0) {
      throw new AppError('Building not found.', 404);
    }

    const {
      name,
      address_line1,
      address_line2,
      city,
      state,
      pincode,
      total_floors,
      description,
    } = req.body;

    let photos = existing.rows[0].photos || [];
    if (req.files && req.files.length > 0) {
      const newPhotos = req.files.map((f) => f.path);
      photos = [...photos, ...newPhotos];
    }

    const result = await query(
      `UPDATE buildings SET
         name          = COALESCE($1, name),
         address_line1 = COALESCE($2, address_line1),
         address_line2 = COALESCE($3, address_line2),
         city          = COALESCE($4, city),
         state         = COALESCE($5, state),
         pincode       = COALESCE($6, pincode),
         total_floors  = COALESCE($7, total_floors),
         description   = COALESCE($8, description),
         photos        = $9
       WHERE id = $10 AND owner_id = $11
       RETURNING *`,
      [
        name?.trim()          || null,
        address_line1?.trim() || null,
        address_line2?.trim() || null,
        city?.trim()          || null,
        state?.trim()         || null,
        pincode?.trim()       || null,
        total_floors          || null,
        description?.trim()   || null,
        photos,
        id,
        req.owner.id,
      ]
    );

    res.status(200).json({
      success: true,
      message: 'Building updated successfully.',
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Remove a specific photo from a building
 * @route  DELETE /api/buildings/:id/photos
 * @access Protected
 * @body   { photo_url: "https://res.cloudinary.com/..." }
 */
const deletePhoto = async (req, res, next) => {
  try {
    const { id }        = req.params;
    const { photo_url } = req.body;

    if (!photo_url) {
      throw new AppError('photo_url is required in request body.', 400);
    }

    // Ensure building belongs to this owner
    const existing = await query(
      'SELECT photos FROM buildings WHERE id = $1 AND owner_id = $2',
      [id, req.owner.id]
    );

    if (existing.rows.length === 0) {
      throw new AppError('Building not found.', 404);
    }

    // Remove this photo URL from the array
    const updatedPhotos = (existing.rows[0].photos || []).filter(
      (p) => p !== photo_url
    );

    await query(
      'UPDATE buildings SET photos = $1 WHERE id = $2',
      [updatedPhotos, id]
    );

    const publicId = getPublicIdFromUrl(photo_url);
    if (publicId) deleteFromCloudinary(publicId);

    res.status(200).json({
      success: true,
      message: 'Photo removed successfully.',
      photos: updatedPhotos,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Delete a building (cascades to units, tenants, etc.)
 * @route  DELETE /api/buildings/:id
 * @access Protected
 */
const deleteBuilding = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM buildings WHERE id = $1 AND owner_id = $2 RETURNING name, photos',
      [id, req.owner.id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Building not found.', 404);
    }

    const photos = result.rows[0].photos || [];
    photos.forEach((url) => {
      const publicId = getPublicIdFromUrl(url);
      if (publicId) deleteFromCloudinary(publicId);
    });

    res.status(200).json({
      success: true,
      message: `Building "${result.rows[0].name}" deleted successfully.`,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllBuildings,
  getBuildingById,
  createBuilding,
  updateBuilding,
  deletePhoto,
  deleteBuilding,
};
