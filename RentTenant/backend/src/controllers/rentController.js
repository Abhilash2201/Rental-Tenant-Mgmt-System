/**
 * @file controllers/rentController.js
 * @description Monthly rent record management.
 * Handles: creating rent records, marking payments, viewing rent history,
 * getting pending dues, and generating monthly rent reports.
 */

const { query }    = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Checks if a rent record with the given month/year already exists for a tenant.
 * Prevents duplicate entries.
 *
 * @param {string} tenantId
 * @param {number} month
 * @param {number} year
 * @returns {boolean}
 */
const rentRecordExists = async (tenantId, month, year) => {
  const result = await query(
    'SELECT id FROM rent_records WHERE tenant_id = $1 AND month = $2 AND year = $3',
    [tenantId, month, year]
  );
  return result.rows.length > 0;
};

// ── Controllers ──────────────────────────────────────────────────────────────

/**
 * @desc   Get rent records for a specific tenant
 * @route  GET /api/rents/tenant/:tenantId
 * @access Protected
 */
const getRentByTenant = async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const { status, year } = req.query;

    // Verify tenant belongs to this owner
    const ownerCheck = await query(
      `SELECT t.id FROM tenants t
       JOIN units u ON u.id = t.unit_id
       JOIN buildings b ON b.id = u.building_id
       WHERE t.id = $1 AND b.owner_id = $2`,
      [tenantId, req.owner.id]
    );

    if (ownerCheck.rows.length === 0) {
      throw new AppError('Tenant not found.', 404);
    }

    let whereClause = 'WHERE r.tenant_id = $1';
    const values    = [tenantId];
    let idx         = 2;

    if (status) {
      whereClause += ` AND r.status = $${idx++}`;
      values.push(status);
    }
    if (year) {
      whereClause += ` AND r.year = $${idx++}`;
      values.push(parseInt(year));
    }

    const result = await query(
      `SELECT r.*,
         u.unit_number, u.floor_number,
         b.name AS building_name
       FROM rent_records r
       JOIN units u ON u.id = r.unit_id
       JOIN buildings b ON b.id = u.building_id
       ${whereClause}
       ORDER BY r.year DESC, r.month DESC`,
      values
    );

    // Calculate total due vs paid summary
    const summary = result.rows.reduce(
      (acc, row) => {
        acc.total_due  += parseFloat(row.amount_due)  || 0;
        acc.total_paid += parseFloat(row.amount_paid) || 0;
        acc.pending_count  += row.status === 'pending'  ? 1 : 0;
        acc.overdue_count  += row.status === 'overdue'  ? 1 : 0;
        return acc;
      },
      { total_due: 0, total_paid: 0, pending_count: 0, overdue_count: 0 }
    );

    res.status(200).json({
      success: true,
      data: result.rows,
      summary,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Get all pending/overdue rents across all buildings (owner dashboard)
 * @route  GET /api/rents/pending
 * @access Protected
 */
const getPendingRents = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT
         r.*,
         t.name         AS tenant_name,
         t.phone        AS tenant_phone,
         u.unit_number,
         u.floor_number,
         b.id           AS building_id,
         b.name         AS building_name
       FROM rent_records r
       JOIN tenants t   ON t.id = r.tenant_id
       JOIN units u     ON u.id = r.unit_id
       JOIN buildings b ON b.id = u.building_id
       WHERE b.owner_id = $1
         AND r.status IN ('pending', 'overdue')
       ORDER BY r.due_date ASC`,
      [req.owner.id]
    );

    // Mark as overdue if due_date has passed and still pending
    const today = new Date().toISOString().split('T')[0];
    const processed = result.rows.map((row) => ({
      ...row,
      is_overdue: row.due_date < today && row.status === 'pending',
    }));

    res.status(200).json({
      success: true,
      count: processed.length,
      data: processed,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Create a rent record for a tenant (for a specific month/year)
 * @route  POST /api/rents
 * @access Protected
 */
const createRentRecord = async (req, res, next) => {
  try {
    const {
      tenant_id,
      month,
      year,
      due_date,
      amount_due,
    } = req.body;

    // Verify tenant belongs to owner
    const tenantResult = await query(
      `SELECT t.*, u.id AS unit_id FROM tenants t
       JOIN units u ON u.id = t.unit_id
       JOIN buildings b ON b.id = u.building_id
       WHERE t.id = $1 AND b.owner_id = $2`,
      [tenant_id, req.owner.id]
    );

    if (tenantResult.rows.length === 0) {
      throw new AppError('Tenant not found.', 404);
    }

    // Prevent duplicate record for same month/year
    const exists = await rentRecordExists(tenant_id, month, year);
    if (exists) {
      throw new AppError(`Rent record for ${month}/${year} already exists for this tenant.`, 409);
    }

    const tenant = tenantResult.rows[0];

    const result = await query(
      `INSERT INTO rent_records
         (tenant_id, unit_id, month, year, due_date, amount_due, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [
        tenant_id,
        tenant.unit_id,
        parseInt(month),
        parseInt(year),
        due_date,
        parseFloat(amount_due),
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Rent record created.',
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Mark a rent record as paid (record payment details)
 * @route  PUT /api/rents/:id/pay
 * @access Protected
 */
const markRentPaid = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      amount_paid,
      payment_mode,
      transaction_ref,
      paid_date,
      notes,
    } = req.body;

    // Verify rent record belongs to owner's tenant
    const check = await query(
      `SELECT r.* FROM rent_records r
       JOIN tenants t ON t.id = r.tenant_id
       JOIN units u   ON u.id = r.unit_id
       JOIN buildings b ON b.id = u.building_id
       WHERE r.id = $1 AND b.owner_id = $2`,
      [id, req.owner.id]
    );

    if (check.rows.length === 0) {
      throw new AppError('Rent record not found.', 404);
    }

    const record     = check.rows[0];
    const paidAmount = parseFloat(amount_paid) || parseFloat(record.amount_due);

    const result = await query(
      `UPDATE rent_records SET
         amount_paid     = $1,
         payment_mode    = $2,
         transaction_ref = $3,
         paid_date       = $4,
         status          = 'paid',
         notes           = $5
       WHERE id = $6
       RETURNING *`,
      [
        paidAmount,
        payment_mode   || 'Cash',
        transaction_ref || null,
        paid_date       || new Date().toISOString().split('T')[0],
        notes           || null,
        id,
      ]
    );

    // Dismiss the corresponding rent_due reminder
    await query(
      `UPDATE reminders SET status = 'dismissed'
       WHERE tenant_id = $1
         AND type = 'rent_due'
         AND EXTRACT(MONTH FROM trigger_date) = $2
         AND EXTRACT(YEAR  FROM trigger_date) = $3
         AND status = 'pending'`,
      [record.tenant_id, record.month, record.year]
    );

    res.status(200).json({
      success: true,
      message: `Rent of ₹${paidAmount} marked as paid.`,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Update overdue status — mark all past-due records as overdue
 *         Called by the nightly cron job (also available as manual API endpoint)
 * @route  POST /api/rents/mark-overdue
 * @access Protected
 */
const markOverdueRents = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const result = await query(
      `UPDATE rent_records SET status = 'overdue'
       WHERE status = 'pending'
         AND due_date < $1
         AND tenant_id IN (
           SELECT t.id FROM tenants t
           JOIN units u ON u.id = t.unit_id
           JOIN buildings b ON b.id = u.building_id
           WHERE b.owner_id = $2
         )
       RETURNING id`,
      [today, req.owner.id]
    );

    res.status(200).json({
      success: true,
      message: `${result.rowCount} rent records marked as overdue.`,
      updated_count: result.rowCount,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Get monthly income summary for the owner (per building)
 * @route  GET /api/rents/report
 * @access Protected
 */
const getRentReport = async (req, res, next) => {
  try {
    // Default to current month/year if not provided
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year  = parseInt(req.query.year)  || new Date().getFullYear();

    const result = await query(
      `SELECT
         b.id              AS building_id,
         b.name            AS building_name,
         COUNT(r.id)       AS total_records,
         SUM(r.amount_due) AS total_due,
         SUM(CASE WHEN r.status = 'paid' THEN r.amount_paid ELSE 0 END) AS total_collected,
         COUNT(CASE WHEN r.status = 'paid' THEN 1 END)    AS paid_count,
         COUNT(CASE WHEN r.status = 'pending' THEN 1 END) AS pending_count,
         COUNT(CASE WHEN r.status = 'overdue' THEN 1 END) AS overdue_count
       FROM rent_records r
       JOIN tenants t ON t.id = r.tenant_id
       JOIN units u   ON u.id = r.unit_id
       JOIN buildings b ON b.id = u.building_id
       WHERE b.owner_id = $1
         AND r.month = $2
         AND r.year  = $3
       GROUP BY b.id, b.name
       ORDER BY b.name`,
      [req.owner.id, month, year]
    );

    // Overall totals
    const totals = result.rows.reduce(
      (acc, row) => {
        acc.total_due       += parseFloat(row.total_due)       || 0;
        acc.total_collected += parseFloat(row.total_collected) || 0;
        acc.paid_count      += parseInt(row.paid_count)        || 0;
        acc.pending_count   += parseInt(row.pending_count)     || 0;
        acc.overdue_count   += parseInt(row.overdue_count)     || 0;
        return acc;
      },
      { total_due: 0, total_collected: 0, paid_count: 0, pending_count: 0, overdue_count: 0 }
    );

    res.status(200).json({
      success: true,
      period: { month, year },
      buildings: result.rows,
      totals,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getRentByTenant,
  getPendingRents,
  createRentRecord,
  markRentPaid,
  markOverdueRents,
  getRentReport,
};
