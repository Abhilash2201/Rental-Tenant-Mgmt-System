/**
 * @file routes/reminderRoutes.js
 * @description Reminder and notification routes.
 * Prefixed with /api/reminders (see routes/index.js)
 */

const express = require('express');
const {
  getReminders,
  getTodaysReminders,
  getUnreadCount,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  dismissReminder,
  renewAgreement,
} = require('../controllers/reminderController');
const { protectOwner } = require('../middleware/firebaseAuth');

const router = express.Router();
router.use(protectOwner);

/**
 * @swagger
 * tags:
 *   name: Reminders
 *   description: Smart reminders — rent due, agreement renewal, rent increment alerts
 */

/**
 * @swagger
 * /api/reminders:
 *   get:
 *     summary: Get all reminders for the owner
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [rent_due, agreement_renewal, rent_increment] }
 *         description: Filter by reminder type
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, sent, dismissed] }
 *       - in: query
 *         name: upcoming_days
 *         schema: { type: integer, example: 7 }
 *         description: Only show reminders due within next N days
 *     responses:
 *       200:
 *         description: List of reminders with tenant and building details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 count:   { type: integer }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Reminder' }
 *                 grouped:
 *                   type: object
 *                   description: Reminders grouped by type
 */
router.get('/', getReminders);

/**
 * @swagger
 * /api/reminders/today:
 *   get:
 *     summary: Get today's due reminders (used by cron job and dashboard)
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Reminders due today or overdue
 */
router.get('/today', getTodaysReminders);

/**
 * @swagger
 * /api/reminders/unread-count:
 *   get:
 *     summary: Get count of unread in-app notifications (for bell icon badge)
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread notification count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:      { type: boolean }
 *                 unread_count: { type: integer, example: 3 }
 */
router.get('/unread-count', getUnreadCount);

/**
 * @swagger
 * /api/reminders/notifications:
 *   get:
 *     summary: Get in-app notifications for the owner's dashboard
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Latest notifications
 */
router.get('/notifications', getNotifications);

/**
 * @swagger
 * /api/reminders/notifications/read-all:
 *   put:
 *     summary: Mark all notifications as read
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.put('/notifications/read-all', markAllNotificationsRead);

/**
 * @swagger
 * /api/reminders/notifications/{id}/read:
 *   put:
 *     summary: Mark a single notification as read
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Notification marked as read
 */
router.put('/notifications/:id/read', markNotificationRead);

/**
 * @swagger
 * /api/reminders/{id}/dismiss:
 *   put:
 *     summary: Dismiss a reminder (owner has acted on it)
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Reminder dismissed
 *       404:
 *         description: Reminder not found
 */
router.put('/:id/dismiss', dismissReminder);

/**
 * @swagger
 * /api/reminders/agreements/{id}/renew:
 *   put:
 *     summary: Renew a rent agreement (from agreement_renewal reminder)
 *     description: |
 *       Creates a new 2-year agreement, optionally with a new rent amount.
 *       Dismisses the old renewal reminder and schedules the next one.
 *     tags: [Reminders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Agreement UUID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               new_end_date:     { type: string, format: date, example: '2027-01-01' }
 *               new_rent_amount:  { type: number, example: 17000 }
 *               notes:            { type: string }
 *     responses:
 *       200:
 *         description: Agreement renewed with new 2-year term
 *       404:
 *         description: Agreement not found
 */
router.put('/agreements/:id/renew', renewAgreement);

module.exports = router;
