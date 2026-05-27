/**
 * @file controllers/tenantController.js
 * @description Tenant management — add, view, update, and move out tenants.
 * When a tenant is added, the system auto-creates:
 *   - A rent agreement (2-year term)
 *   - First month's rent record
 *   - Three reminder schedules (rent_due, agreement_renewal, rent_increment)
 */

const { query, getClient } = require('../config/db');
const { AppError }         = require('../middleware/errorHandler');

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Adds months to a date and returns a new Date.
 * Used for calculating agreement end dates and reminder trigger dates.
 *
 * @param {Date}   date   - Base date
 * @param {number} months - Number of months to add
 * @returns {Date}
 */
const addMonths = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
};

/**
 * Format a Date to PostgreSQL-friendly 'YYYY-MM-DD' string.
 *
 * @param {Date} date
 * @returns {string}
 */
const toDateStr = (date) => date.toISOString().split('T')[0];

// ── Controllers ──────────────────────────────────────────────────────────────

/**
 * @desc   Get all tenants for the logged-in owner (across all buildings)
 * @route  GET /api/tenants
 * @access Protected
 */
const getAllTenants = async (req, res, next) => {
  try {
    const { active, building_id, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE b.owner_id = $1';
    const values    = [req.owner.id];
    let idx         = 2;

    // Filter by active status
    if (active !== undefined) {
      whereClause += ` AND t.is_active = $${idx++}`;
      values.push(active === 'true');
    }

    // Filter by specific building
    if (building_id) {
      whereClause += ` AND b.id = $${idx++}`;
      values.push(building_id);
    }

    const countResult = await query(
      `SELECT COUNT(t.id)
       FROM tenants t
       JOIN units u     ON u.id = t.unit_id
       JOIN buildings b ON b.id = u.building_id
       ${whereClause}`,
      values
    );

    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT
         t.*,
         u.unit_number,
         u.floor_number,
         u.rent_amount     AS current_rent,
         b.id              AS building_id,
         b.name            AS building_name,
         b.city            AS building_city,
         a.id              AS agreement_id,
         a.end_date        AS agreement_end_date,
         a.status          AS agreement_status
       FROM tenants t
       JOIN units u     ON u.id = t.unit_id
       JOIN buildings b ON b.id = u.building_id
       LEFT JOIN agreements a
         ON a.tenant_id = t.id AND a.status = 'active'
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset]
    );

    res.status(200).json({
      success: true,
      data: result.rows,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Get a single tenant with full details, agreement, and rent history
 * @route  GET /api/tenants/:id
 * @access Protected
 */
const getTenantById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Tenant details
    const tenantResult = await query(
      `SELECT
         t.*,
         u.unit_number, u.floor_number, u.rent_amount,
         b.id   AS building_id,
         b.name AS building_name
       FROM tenants t
       JOIN units u     ON u.id = t.unit_id
       JOIN buildings b ON b.id = u.building_id
       WHERE t.id = $1 AND b.owner_id = $2`,
      [id, req.owner.id]
    );

    if (tenantResult.rows.length === 0) {
      throw new AppError('Tenant not found.', 404);
    }

    // Active agreement
    const agreementResult = await query(
      'SELECT * FROM agreements WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1',
      [id]
    );

    // Rent history (last 12 months)
    const rentResult = await query(
      `SELECT * FROM rent_records
       WHERE tenant_id = $1
       ORDER BY year DESC, month DESC
       LIMIT 12`,
      [id]
    );

    // Pending reminders for this tenant
    const remindersResult = await query(
      `SELECT * FROM reminders
       WHERE tenant_id = $1 AND status = 'pending'
       ORDER BY trigger_date ASC`,
      [id]
    );

    res.status(200).json({
      success: true,
      data: {
        ...tenantResult.rows[0],
        agreement:    agreementResult.rows[0] || null,
        rent_history: rentResult.rows,
        reminders:    remindersResult.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Add a new tenant to a unit
 *         Automatically creates: agreement, first rent record, and all reminders
 * @route  POST /api/tenants
 * @access Protected
 */
const createTenant = async (req, res, next) => {
  // Use a transaction — all-or-nothing: tenant + agreement + rent + reminders
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const {
      unit_id,
      name,
      email,
      phone,
      alternate_phone,
      id_proof_type,
      id_proof_number,
      emergency_contact_name,
      emergency_contact_phone,
      move_in_date,
    } = req.body;

    // ── Verify unit belongs to owner and is vacant ──────────────────────────
    const unitCheck = await client.query(
      `SELECT u.*, b.owner_id, b.name AS building_name
       FROM units u
       JOIN buildings b ON b.id = u.building_id
       WHERE u.id = $1 AND b.owner_id = $2`,
      [unit_id, req.owner.id]
    );

    if (unitCheck.rows.length === 0) {
      throw new AppError('Unit not found.', 404);
    }

    const unit = unitCheck.rows[0];

    if (unit.status === 'occupied') {
      throw new AppError(
        `Unit ${unit.unit_number} is already occupied. Move out the current tenant first.`,
        400
      );
    }

    // Handle uploaded files (from multer)
    const photo_url    = req.files?.photo?.[0]?.path    || null;
    const id_proof_url = req.files?.id_proof?.[0]?.path || null;

    // ── 1. Create tenant record ──────────────────────────────────────────────
    const tenantResult = await client.query(
      `INSERT INTO tenants
         (unit_id, name, email, phone, alternate_phone,
          id_proof_type, id_proof_number, id_proof_url,
          photo_url, emergency_contact_name, emergency_contact_phone,
          move_in_date, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,TRUE)
       RETURNING *`,
      [
        unit_id,
        name.trim(),
        email?.toLowerCase().trim() || null,
        phone.trim(),
        alternate_phone?.trim()             || null,
        id_proof_type?.trim()               || null,
        id_proof_number?.trim()             || null,
        id_proof_url,
        photo_url,
        emergency_contact_name?.trim()      || null,
        emergency_contact_phone?.trim()     || null,
        move_in_date,
      ]
    );

    const tenant       = tenantResult.rows[0];
    const moveIn       = new Date(move_in_date);
    const agreementEnd = addMonths(moveIn, 24); // 2-year agreement

    // ── 2. Create rent agreement (2-year term) ───────────────────────────────
    const agreementResult = await client.query(
      `INSERT INTO agreements
         (tenant_id, unit_id, start_date, end_date, rent_amount, deposit_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       RETURNING *`,
      [
        tenant.id,
        unit_id,
        toDateStr(moveIn),
        toDateStr(agreementEnd),
        unit.rent_amount,
        unit.deposit_amount,
      ]
    );

    // ── 3. Mark unit as occupied ─────────────────────────────────────────────
    await client.query(
      "UPDATE units SET status = 'occupied' WHERE id = $1",
      [unit_id]
    );

    // ── 4. Create first month's rent record ──────────────────────────────────
    // Due date: 1st of the month following move-in
    const firstDueDate = new Date(moveIn.getFullYear(), moveIn.getMonth() + 1, 1);

    await client.query(
      `INSERT INTO rent_records
         (tenant_id, unit_id, month, year, due_date, amount_due, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
      [
        tenant.id,
        unit_id,
        firstDueDate.getMonth() + 1, // month is 1-indexed
        firstDueDate.getFullYear(),
        toDateStr(firstDueDate),
        unit.rent_amount,
      ]
    );

    // ── 5. Schedule the 3 reminder types ────────────────────────────────────

    // (a) Rent due reminder — trigger 3 days before first due date
    const rentReminderDate = new Date(firstDueDate);
    rentReminderDate.setDate(rentReminderDate.getDate() - 3);

    await client.query(
      `INSERT INTO reminders
         (owner_id, tenant_id, unit_id, type, title, message, trigger_date)
       VALUES ($1,$2,$3,'rent_due',$4,$5,$6)`,
      [
        req.owner.id,
        tenant.id,
        unit_id,
        `Rent Due: ${name}`,
        `Rent of ₹${unit.rent_amount} is due on ${toDateStr(firstDueDate)} from tenant ${name} in Unit ${unit.unit_number}.`,
        toDateStr(rentReminderDate),
      ]
    );

    // (b) Rent increment reminder — trigger after 11 months
    const incrementDate = addMonths(moveIn, 11);

    await client.query(
      `INSERT INTO reminders
         (owner_id, tenant_id, unit_id, type, title, message, trigger_date)
       VALUES ($1,$2,$3,'rent_increment',$4,$5,$6)`,
      [
        req.owner.id,
        tenant.id,
        unit_id,
        `Rent Increment Due: ${name}`,
        `It has been 11 months since ${name} moved in to Unit ${unit.unit_number}. Consider revising the rent amount (currently ₹${unit.rent_amount}).`,
        toDateStr(incrementDate),
      ]
    );

    // (c) Agreement renewal reminder — trigger 60 days before 2-year end date
    const renewalDate = new Date(agreementEnd);
    renewalDate.setDate(renewalDate.getDate() - 60);

    await client.query(
      `INSERT INTO reminders
         (owner_id, tenant_id, unit_id, type, title, message, trigger_date)
       VALUES ($1,$2,$3,'agreement_renewal',$4,$5,$6)`,
      [
        req.owner.id,
        tenant.id,
        unit_id,
        `Agreement Renewal: ${name}`,
        `The rent agreement with ${name} for Unit ${unit.unit_number} expires on ${toDateStr(agreementEnd)}. Please renew or terminate the agreement.`,
        toDateStr(renewalDate),
      ]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `Tenant ${name} added successfully. Agreement, rent record, and reminders created.`,
      data: {
        tenant,
        agreement: agreementResult.rows[0],
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * @desc   Update tenant details (name, phone, ID proof, etc.)
 * @route  PUT /api/tenants/:id
 * @access Protected
 */
const updateTenant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name, email, phone, alternate_phone,
      id_proof_type, id_proof_number,
      emergency_contact_name, emergency_contact_phone,
    } = req.body;

    // Verify ownership
    const check = await query(
      `SELECT t.id FROM tenants t
       JOIN units u ON u.id = t.unit_id
       JOIN buildings b ON b.id = u.building_id
       WHERE t.id = $1 AND b.owner_id = $2`,
      [id, req.owner.id]
    );

    if (check.rows.length === 0) {
      throw new AppError('Tenant not found.', 404);
    }

    // Handle optional file uploads
    const photo_url    = req.files?.photo?.[0]?.path    || undefined;
    const id_proof_url = req.files?.id_proof?.[0]?.path || undefined;

    const result = await query(
      `UPDATE tenants SET
         name                    = COALESCE($1,  name),
         email                   = COALESCE($2,  email),
         phone                   = COALESCE($3,  phone),
         alternate_phone         = COALESCE($4,  alternate_phone),
         id_proof_type           = COALESCE($5,  id_proof_type),
         id_proof_number         = COALESCE($6,  id_proof_number),
         emergency_contact_name  = COALESCE($7,  emergency_contact_name),
         emergency_contact_phone = COALESCE($8,  emergency_contact_phone),
         photo_url               = COALESCE($9,  photo_url),
         id_proof_url            = COALESCE($10, id_proof_url)
       WHERE id = $11
       RETURNING *`,
      [
        name?.trim()                    || null,
        email?.toLowerCase().trim()     || null,
        phone?.trim()                   || null,
        alternate_phone?.trim()         || null,
        id_proof_type?.trim()           || null,
        id_proof_number?.trim()         || null,
        emergency_contact_name?.trim()  || null,
        emergency_contact_phone?.trim() || null,
        photo_url                       || null,
        id_proof_url                    || null,
        id,
      ]
    );

    res.status(200).json({
      success: true,
      message: 'Tenant details updated successfully.',
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Move out a tenant — deactivates tenant and marks unit as vacant
 * @route  PUT /api/tenants/:id/move-out
 * @access Protected
 */
const moveTenantOut = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { move_out_date, notes } = req.body;

    // Verify ownership
    const tenantResult = await client.query(
      `SELECT t.*, u.id AS unit_id FROM tenants t
       JOIN units u ON u.id = t.unit_id
       JOIN buildings b ON b.id = u.building_id
       WHERE t.id = $1 AND b.owner_id = $2 AND t.is_active = TRUE`,
      [id, req.owner.id]
    );

    if (tenantResult.rows.length === 0) {
      throw new AppError('Active tenant not found.', 404);
    }

    const tenant = tenantResult.rows[0];
    const moveOutDate = move_out_date || toDateStr(new Date());

    // 1. Mark tenant as inactive with move-out date
    await client.query(
      `UPDATE tenants SET
         is_active = FALSE, move_out_date = $1
       WHERE id = $2`,
      [moveOutDate, id]
    );

    // 2. Mark unit as vacant
    await client.query(
      "UPDATE units SET status = 'vacant' WHERE id = $1",
      [tenant.unit_id]
    );

    // 3. Terminate active agreement
    await client.query(
      `UPDATE agreements SET status = 'terminated'
       WHERE tenant_id = $1 AND status = 'active'`,
      [id]
    );

    // 4. Dismiss all pending reminders for this tenant
    await client.query(
      "UPDATE reminders SET status = 'dismissed' WHERE tenant_id = $1 AND status = 'pending'",
      [id]
    );

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: `Tenant ${tenant.name} moved out on ${moveOutDate}. Unit is now vacant.`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

module.exports = {
  getAllTenants,
  getTenantById,
  createTenant,
  updateTenant,
  moveTenantOut,
};
