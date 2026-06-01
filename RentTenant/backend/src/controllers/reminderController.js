/**
 * @file controllers/reminderController.js
 * @description Reminder and in-app notification management.
 * Reminders are auto-created when a tenant is added.
 * This controller lets owners view, dismiss, and manage their reminders.
 */

const { query }    = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

/**
 * @desc   Get all reminders for the owner (with optional filters)
 * @route  GET /api/reminders
 * @access Protected
 */
const getReminders = async (req, res, next) => {
  try {
    const { type, status, upcoming_days } = req.query;

    let whereClause = 'WHERE r.owner_id = $1';
    const values    = [req.owner.id];
    let idx         = 2;

    // Filter by reminder type (rent_due | agreement_renewal | rent_increment)
    if (type) {
      whereClause += ` AND r.type = $${idx++}`;
      values.push(type);
    }

    // Filter by status (pending | sent | dismissed)
    if (status) {
      whereClause += ` AND r.status = $${idx++}`;
      values.push(status);
    }

    // Show only reminders due within next N days
    if (upcoming_days) {
      whereClause += ` AND r.trigger_date <= CURRENT_DATE + INTERVAL '${parseInt(upcoming_days)} days'
                      AND r.trigger_date >= CURRENT_DATE`;
    }

    const result = await query(
      `SELECT
         r.*,
         t.name         AS tenant_name,
         t.phone        AS tenant_phone,
         u.unit_number,
         u.floor_number,
         b.name         AS building_name
       FROM reminders r
       LEFT JOIN tenants t    ON t.id = r.tenant_id
       LEFT JOIN units u      ON u.id = r.unit_id
       LEFT JOIN buildings b  ON b.id = u.building_id
       ${whereClause}
       ORDER BY r.trigger_date ASC, r.created_at DESC`,
      values
    );

    // Group by type for dashboard view
    const grouped = {
      rent_due:           result.rows.filter((r) => r.type === 'rent_due'),
      agreement_renewal:  result.rows.filter((r) => r.type === 'agreement_renewal'),
      rent_increment:     result.rows.filter((r) => r.type === 'rent_increment'),
    };

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows,
      grouped,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Get today's reminders that need to fire (used by cron job)
 * @route  GET /api/reminders/today
 * @access Protected
 */
const getTodaysReminders = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT r.*,
         t.name  AS tenant_name,
         t.email AS tenant_email,
         t.phone AS tenant_phone,
         u.unit_number,
         u.rent_amount,
         b.name  AS building_name,
         o.email AS owner_email,
         o.name  AS owner_name
       FROM reminders r
       JOIN owners o   ON o.id = r.owner_id
       LEFT JOIN tenants t   ON t.id = r.tenant_id
       LEFT JOIN units u     ON u.id = r.unit_id
       LEFT JOIN buildings b ON b.id = u.building_id
       WHERE r.owner_id = $1
         AND r.trigger_date <= CURRENT_DATE
         AND r.status = 'pending'
       ORDER BY r.trigger_date ASC`,
      [req.owner.id]
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
 * @desc   Get unread in-app notifications count (for dashboard bell icon)
 * @route  GET /api/reminders/unread-count
 * @access Protected
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT COUNT(*) FROM reminders WHERE owner_id = $1 AND is_read = FALSE AND status = \'pending\'',
      [req.owner.id]
    );

    res.status(200).json({
      success: true,
      unread_count: parseInt(result.rows[0].count),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Get all in-app notifications for the owner
 * @route  GET /api/reminders/notifications
 * @access Protected
 */
const getNotifications = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const result = await query(
      `SELECT r.*,
         t.name AS tenant_name,
         u.unit_number,
         b.name AS building_name
       FROM reminders r
       LEFT JOIN tenants t   ON t.id = r.tenant_id
       LEFT JOIN units u     ON u.id = r.unit_id
       LEFT JOIN buildings b ON b.id = u.building_id
       WHERE r.owner_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2`,
      [req.owner.id, limit]
    );

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Mark a single notification as read
 * @route  PUT /api/reminders/notifications/:id/read
 * @access Protected
 */
const markNotificationRead = async (req, res, next) => {
  try {
    await query(
      'UPDATE reminders SET is_read = TRUE WHERE id = $1 AND owner_id = $2',
      [req.params.id, req.owner.id]
    );

    res.status(200).json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Mark all notifications as read
 * @route  PUT /api/reminders/notifications/read-all
 * @access Protected
 */
const markAllNotificationsRead = async (req, res, next) => {
  try {
    const result = await query(
      'UPDATE reminders SET is_read = TRUE WHERE owner_id = $1 AND is_read = FALSE',
      [req.owner.id]
    );

    res.status(200).json({
      success: true,
      message: `${result.rowCount} notifications marked as read.`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Dismiss a reminder (owner has acted on it)
 * @route  PUT /api/reminders/:id/dismiss
 * @access Protected
 */
const dismissReminder = async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE reminders SET status = 'dismissed'
       WHERE id = $1 AND owner_id = $2
       RETURNING id`,
      [req.params.id, req.owner.id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Reminder not found.', 404);
    }

    res.status(200).json({ success: true, message: 'Reminder dismissed.' });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc   Renew a rent agreement (triggered from agreement_renewal reminder)
 * @route  PUT /api/reminders/agreements/:id/renew
 * @access Protected
 */
const renewAgreement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { new_end_date, new_rent_amount, notes } = req.body;

    // Verify agreement belongs to owner
    const check = await query(
      `SELECT a.*, t.name AS tenant_name, u.unit_number
       FROM agreements a
       JOIN tenants t ON t.id = a.tenant_id
       JOIN units u   ON u.id = a.unit_id
       JOIN buildings b ON b.id = u.building_id
       WHERE a.id = $1 AND b.owner_id = $2`,
      [id, req.owner.id]
    );

    if (check.rows.length === 0) {
      throw new AppError('Agreement not found.', 404);
    }

    const agreement = check.rows[0];

    // Close current agreement and create a new one
    await query(
      "UPDATE agreements SET status = 'renewed' WHERE id = $1",
      [id]
    );

    const newEnd = new_end_date || (() => {
      const d = new Date(agreement.end_date);
      d.setFullYear(d.getFullYear() + 2);
      return d.toISOString().split('T')[0];
    })();

    const newRent = new_rent_amount || agreement.rent_amount;

    const newAgreement = await query(
      `INSERT INTO agreements
         (tenant_id, unit_id, start_date, end_date, rent_amount, deposit_amount, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, 'active', $7)
       RETURNING *`,
      [
        agreement.tenant_id,
        agreement.unit_id,
        agreement.end_date,   // New agreement starts where old one ended
        newEnd,
        newRent,
        agreement.deposit_amount,
        notes || null,
      ]
    );

    // Update unit's rent amount if it changed
    if (new_rent_amount && new_rent_amount !== agreement.rent_amount) {
      await query(
        'UPDATE units SET rent_amount = $1 WHERE id = $2',
        [newRent, agreement.unit_id]
      );
    }

    // Dismiss the renewal reminder
    await query(
      `UPDATE reminders SET status = 'dismissed'
       WHERE tenant_id = $1 AND type = 'agreement_renewal' AND status = 'pending'`,
      [agreement.tenant_id]
    );

    // Schedule the next renewal reminder (2 years from now - 60 days)
    const nextRenewal = new Date(newEnd);
    nextRenewal.setDate(nextRenewal.getDate() - 60);

    await query(
      `INSERT INTO reminders
         (owner_id, tenant_id, unit_id, type, title, message, trigger_date)
       VALUES ($1,$2,$3,'agreement_renewal',$4,$5,$6)`,
      [
        req.owner.id,
        agreement.tenant_id,
        agreement.unit_id,
        `Agreement Renewal: ${agreement.tenant_name}`,
        `The renewed agreement with ${agreement.tenant_name} for Unit ${agreement.unit_number} expires on ${newEnd}.`,
        nextRenewal.toISOString().split('T')[0],
      ]
    );

    res.status(200).json({
      success: true,
      message: 'Agreement renewed successfully.',
      data: newAgreement.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getReminders,
  getTodaysReminders,
  getUnreadCount,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  dismissReminder,
  renewAgreement,
};
