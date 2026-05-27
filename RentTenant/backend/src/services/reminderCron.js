/**
 * @file services/reminderCron.js
 * @description Scheduled cron job that runs daily at 9:00 AM.
 * Checks the reminders table for due reminders and:
 *   1. Sends email notifications to the property owner
 *   2. Creates in-app notifications in the notifications table
 *   3. Marks pending rents as overdue if past due date
 *   4. Updates reminder status from 'pending' → 'sent'
 *
 * Cron Expression:  '0 9 * * *'  → Every day at 9:00 AM
 */

const cron = require('node-cron');
const { query, getClient } = require('../config/db');
const {
  sendRentDueEmail,
  sendAgreementRenewalEmail,
  sendRentIncrementEmail,
} = require('./emailService');

// ── Reminder Processor ────────────────────────────────────────────────────────

/**
 * Processes a single reminder — sends email + creates in-app notification.
 *
 * @param {Object} reminder - Reminder row from the database (with joined tenant/unit/building info)
 * @param {Object} client   - PostgreSQL client (for transaction safety)
 */
const processReminder = async (reminder, client) => {
  const {
    id:             reminderId,
    owner_id,
    owner_email,
    owner_name,
    tenant_id,
    tenant_name,
    tenant_phone,
    unit_id,
    unit_number,
    floor_number,
    rent_amount,
    building_name,
    move_in_date,
    agreement_end_date,
    due_date,
    type,
    title,
    message,
  } = reminder;

  // ── 1. Create in-app notification ──────────────────────────────────────────
  await client.query(
    `INSERT INTO notifications
       (owner_id, reminder_id, title, message, type)
     VALUES ($1, $2, $3, $4, $5)`,
    [owner_id, reminderId, title, message, type]
  );

  // ── 2. Send email notification ─────────────────────────────────────────────
  const emailData = {
    owner_name,
    tenant_name,
    tenant_phone,
    unit_number,
    floor_number,
    building_name,
    rent_amount,
    move_in_date,
    agreement_end_date,
    due_date,
  };

  if (type === 'rent_due') {
    await sendRentDueEmail(owner_email, emailData);
  } else if (type === 'agreement_renewal') {
    await sendAgreementRenewalEmail(owner_email, emailData);
  } else if (type === 'rent_increment') {
    await sendRentIncrementEmail(owner_email, emailData);
  }

  // ── 3. Mark reminder as sent ───────────────────────────────────────────────
  await client.query(
    "UPDATE reminders SET status = 'sent' WHERE id = $1",
    [reminderId]
  );

  // ── 4. For rent_due reminders, schedule next month's reminder ──────────────
  if (type === 'rent_due' && tenant_id && unit_id) {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(nextMonth.getDate() - 3); // 3 days before next due date

    const nextDueDate = new Date();
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    nextDueDate.setDate(1); // 1st of next month

    // Check if next month's reminder already exists
    const existing = await client.query(
      `SELECT id FROM reminders
       WHERE tenant_id = $1 AND type = 'rent_due'
         AND EXTRACT(MONTH FROM trigger_date) = $2
         AND EXTRACT(YEAR  FROM trigger_date) = $3
         AND status = 'pending'`,
      [
        tenant_id,
        nextMonth.getMonth() + 1,
        nextMonth.getFullYear(),
      ]
    );

    if (existing.rows.length === 0) {
      const nextDueDateStr = nextDueDate.toISOString().split('T')[0];
      await client.query(
        `INSERT INTO reminders
           (owner_id, tenant_id, unit_id, type, title, message, trigger_date)
         VALUES ($1,$2,$3,'rent_due',$4,$5,$6)`,
        [
          owner_id,
          tenant_id,
          unit_id,
          `Rent Due: ${tenant_name}`,
          `Rent of ₹${rent_amount} is due on ${nextDueDateStr} from ${tenant_name} in Unit ${unit_number}.`,
          nextMonth.toISOString().split('T')[0],
        ]
      );
    }
  }
};

// ── Cron Job Main Function ────────────────────────────────────────────────────

/**
 * Main job function — fetches all due reminders and processes them.
 * Runs in a transaction per reminder for safe rollback on failure.
 */
const runDailyReminderJob = async () => {
  console.log(`\n[Cron] 🕘 Daily reminder job started — ${new Date().toISOString()}`);

  let client;
  try {
    client = await getClient();

    // ── Step 1: Fetch all pending reminders due today or earlier ─────────────
    const remindersResult = await client.query(
      `SELECT
         r.*,
         o.email  AS owner_email,
         o.name   AS owner_name,
         t.name   AS tenant_name,
         t.phone  AS tenant_phone,
         t.move_in_date,
         u.unit_number,
         u.floor_number,
         u.rent_amount,
         b.name   AS building_name,
         a.end_date AS agreement_end_date,
         rr.due_date
       FROM reminders r
       JOIN owners o     ON o.id = r.owner_id
       LEFT JOIN tenants t    ON t.id = r.tenant_id
       LEFT JOIN units u      ON u.id = r.unit_id
       LEFT JOIN buildings b  ON b.id = u.building_id
       LEFT JOIN agreements a
         ON a.tenant_id = t.id AND a.status = 'active'
       LEFT JOIN rent_records rr
         ON rr.tenant_id = t.id
         AND rr.month = EXTRACT(MONTH FROM CURRENT_DATE)
         AND rr.year  = EXTRACT(YEAR FROM CURRENT_DATE)
       WHERE r.trigger_date <= CURRENT_DATE
         AND r.status = 'pending'
       ORDER BY r.trigger_date ASC`
    );

    const reminders = remindersResult.rows;
    console.log(`[Cron] Found ${reminders.length} pending reminder(s)`);

    // ── Step 2: Process each reminder individually ────────────────────────────
    let successCount = 0;
    let failCount    = 0;

    for (const reminder of reminders) {
      try {
        await client.query('BEGIN');
        await processReminder(reminder, client);
        await client.query('COMMIT');
        successCount++;
        console.log(`[Cron]   ✅ Processed: [${reminder.type}] ${reminder.title}`);
      } catch (err) {
        await client.query('ROLLBACK');
        failCount++;
        console.error(`[Cron]   ❌ Failed: [${reminder.type}] ${reminder.title} — ${err.message}`);
      }
    }

    // ── Step 3: Mark overdue rent records ─────────────────────────────────────
    const overdueResult = await client.query(
      `UPDATE rent_records SET status = 'overdue'
       WHERE status = 'pending'
         AND due_date < CURRENT_DATE
       RETURNING id`
    );

    if (overdueResult.rowCount > 0) {
      console.log(`[Cron]   📋 Marked ${overdueResult.rowCount} rent records as overdue`);
    }

    console.log(`[Cron] ✅ Job complete — ${successCount} sent, ${failCount} failed\n`);
  } catch (err) {
    console.error('[Cron] ❌ Job error:', err.message);
  } finally {
    if (client) client.release();
  }
};

// ── Start Cron ────────────────────────────────────────────────────────────────

/**
 * Initialize and start the daily cron scheduler.
 * Called once from server.js on startup.
 *
 * Schedule: '0 9 * * *' = Every day at 9:00 AM server time
 *
 * To change the time, modify the cron expression:
 *   '0 8  * * *' = 8:00 AM
 *   '30 9 * * *' = 9:30 AM
 */
const startReminderCron = () => {
  console.log('⏰ Reminder cron job scheduled (daily at 9:00 AM)');

  cron.schedule('0 9 * * *', runDailyReminderJob, {
    scheduled: true,
    timezone: 'Asia/Kolkata', // IST timezone (change as needed)
  });

  // In development, also run immediately on startup if there are pending reminders
  if (process.env.NODE_ENV === 'development') {
    console.log('[Cron] Development mode: running initial check...');
    runDailyReminderJob();
  }
};

module.exports = { startReminderCron, runDailyReminderJob };
