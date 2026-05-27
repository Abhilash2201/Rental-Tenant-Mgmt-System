/**
 * @file services/emailService.js
 * @description Email notification service using Nodemailer.
 * Sends reminder emails to the property owner for:
 *   - Monthly rent collection reminders
 *   - Rent agreement renewal alerts (2-year cycle)
 *   - Rent increment suggestions (11-month cycle)
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

// ── Transporter Configuration ────────────────────────────────────────────────
/**
 * Nodemailer transporter — configured for Gmail SMTP.
 * For Gmail, generate an App Password:
 *   1. Enable 2FA on Gmail
 *   2. Go to Account → Security → App Passwords
 *   3. Create a password for "Mail"
 *   4. Use that in EMAIL_PASS env variable
 */
const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST   || 'smtp.gmail.com',
  port:   parseInt(process.env.EMAIL_PORT) || 587,
  secure: false, // true for 465, false for 587 (STARTTLS)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false, // Avoids cert errors in development
  },
});

/**
 * Verify transporter connection on startup.
 * Logs a warning if email is not configured (non-fatal).
 */
transporter.verify((err) => {
  if (err) {
    console.warn('⚠️  Email service not configured:', err.message);
    console.warn('   → Set EMAIL_USER and EMAIL_PASS in .env to enable email reminders');
  } else {
    console.log('📧 Email service ready');
  }
});

// ── Email Templates ──────────────────────────────────────────────────────────

/**
 * Base HTML template wrapper.
 * All emails share the same header/footer styling.
 *
 * @param {string} content - Inner HTML content for the email body
 * @returns {string} Complete HTML email string
 */
const baseTemplate = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Rent Manager Reminder</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 30px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: #1a1a2e; padding: 20px 30px; color: white; }
    .header h1 { margin: 0; font-size: 22px; }
    .header p  { margin: 5px 0 0; font-size: 13px; color: #aaa; }
    .body   { padding: 30px; color: #333; }
    .body h2 { color: #1a1a2e; margin-top: 0; }
    .info-box { background: #f8f9ff; border-left: 4px solid #4361ee; padding: 15px 20px; margin: 20px 0; border-radius: 4px; }
    .info-box p { margin: 5px 0; font-size: 14px; }
    .info-box strong { color: #1a1a2e; }
    .alert-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px 20px; margin: 20px 0; border-radius: 4px; }
    .cta-btn { display: inline-block; background: #4361ee; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 10px; }
    .footer { background: #f4f4f4; padding: 15px 30px; text-align: center; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏢 Rent Manager</h1>
      <p>Property Management System</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>This is an automated reminder from your Rent Management System.</p>
      <p>© ${new Date().getFullYear()} Rent Manager | Do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
`;

/**
 * Email template for monthly rent due reminder.
 *
 * @param {Object} data - Reminder data with tenant and unit info
 * @returns {{ subject: string, html: string }}
 */
const rentDueTemplate = (data) => ({
  subject: `🔔 Rent Due Reminder — ${data.tenant_name} | Unit ${data.unit_number}`,
  html: baseTemplate(`
    <h2>📋 Rent Collection Reminder</h2>
    <p>Hello <strong>${data.owner_name}</strong>,</p>
    <p>This is a reminder that rent is due from your tenant.</p>

    <div class="info-box">
      <p><strong>🏠 Building:</strong>  ${data.building_name}</p>
      <p><strong>🚪 Unit:</strong>      ${data.unit_number} (Floor ${data.floor_number})</p>
      <p><strong>👤 Tenant:</strong>    ${data.tenant_name}</p>
      <p><strong>📞 Phone:</strong>     ${data.tenant_phone}</p>
      <p><strong>💰 Amount Due:</strong> ₹${data.rent_amount}</p>
      <p><strong>📅 Due Date:</strong>  ${data.due_date}</p>
    </div>

    <div class="alert-box">
      <p>⚠️ Please collect the rent on or before the due date to avoid late tracking.</p>
    </div>

    <p>Log in to your Rent Manager dashboard to record the payment once received.</p>
  `),
});

/**
 * Email template for rent agreement renewal alert.
 *
 * @param {Object} data
 * @returns {{ subject: string, html: string }}
 */
const agreementRenewalTemplate = (data) => ({
  subject: `📜 Agreement Renewal Alert — ${data.tenant_name} | Unit ${data.unit_number}`,
  html: baseTemplate(`
    <h2>📜 Rent Agreement Renewal Required</h2>
    <p>Hello <strong>${data.owner_name}</strong>,</p>
    <p>The rent agreement for the following tenant is expiring soon.</p>

    <div class="info-box">
      <p><strong>🏠 Building:</strong>       ${data.building_name}</p>
      <p><strong>🚪 Unit:</strong>           ${data.unit_number} (Floor ${data.floor_number})</p>
      <p><strong>👤 Tenant:</strong>         ${data.tenant_name}</p>
      <p><strong>📅 Agreement Expires:</strong> ${data.agreement_end_date}</p>
      <p><strong>💰 Current Rent:</strong>   ₹${data.rent_amount}/month</p>
    </div>

    <div class="alert-box">
      <p>⚠️ The agreement expires in approximately 60 days. Please take action to:</p>
      <ul>
        <li>✅ <strong>Renew</strong> the agreement (with or without rent revision)</li>
        <li>❌ <strong>Terminate</strong> if the tenant will vacate</li>
      </ul>
    </div>

    <p>Login to Rent Manager to renew the agreement directly from the dashboard.</p>
  `),
});

/**
 * Email template for rent increment suggestion (after 11 months).
 *
 * @param {Object} data
 * @returns {{ subject: string, html: string }}
 */
const rentIncrementTemplate = (data) => ({
  subject: `💰 Rent Increment Suggestion — ${data.tenant_name} | Unit ${data.unit_number}`,
  html: baseTemplate(`
    <h2>💹 Rent Increment Review</h2>
    <p>Hello <strong>${data.owner_name}</strong>,</p>
    <p>It has been <strong>11 months</strong> since ${data.tenant_name} moved in. This is a good time to review and potentially revise the rent.</p>

    <div class="info-box">
      <p><strong>🏠 Building:</strong>      ${data.building_name}</p>
      <p><strong>🚪 Unit:</strong>          ${data.unit_number} (Floor ${data.floor_number})</p>
      <p><strong>👤 Tenant:</strong>        ${data.tenant_name}</p>
      <p><strong>📅 Move-in Date:</strong>  ${data.move_in_date}</p>
      <p><strong>💰 Current Rent:</strong>  ₹${data.rent_amount}/month</p>
    </div>

    <div class="alert-box">
      <p>💡 <strong>Suggestion:</strong> Consider a rent revision before the 1-year mark.
         A typical increment is <strong>5–10%</strong> of the current rent.</p>
    </div>

    <p>Login to Rent Manager to update the rent amount for this unit.</p>
  `),
});

// ── Send Email ────────────────────────────────────────────────────────────────

/**
 * Generic send email function.
 * Wrapped in try-catch — email failure is non-fatal (app still works without email).
 *
 * @param {string} to      - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html    - HTML email body
 * @returns {Promise<boolean>} True if sent, false if failed
 */
const sendEmail = async (to, subject, html) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn(`[Email] Skipped — email not configured. Would have sent: "${subject}" to ${to}`);
      return false;
    }

    await transporter.sendMail({
      from:    process.env.EMAIL_FROM || `"Rent Manager" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`[Email] ✅ Sent "${subject}" → ${to}`);
    return true;
  } catch (err) {
    console.error(`[Email] ❌ Failed to send "${subject}" → ${to}:`, err.message);
    return false;
  }
};

/**
 * Send a rent due reminder email.
 *
 * @param {string} ownerEmail
 * @param {Object} data - Tenant, unit, and building details
 */
const sendRentDueEmail = (ownerEmail, data) => {
  const { subject, html } = rentDueTemplate(data);
  return sendEmail(ownerEmail, subject, html);
};

/**
 * Send an agreement renewal alert email.
 *
 * @param {string} ownerEmail
 * @param {Object} data
 */
const sendAgreementRenewalEmail = (ownerEmail, data) => {
  const { subject, html } = agreementRenewalTemplate(data);
  return sendEmail(ownerEmail, subject, html);
};

/**
 * Send a rent increment suggestion email.
 *
 * @param {string} ownerEmail
 * @param {Object} data
 */
const sendRentIncrementEmail = (ownerEmail, data) => {
  const { subject, html } = rentIncrementTemplate(data);
  return sendEmail(ownerEmail, subject, html);
};

module.exports = {
  sendEmail,
  sendRentDueEmail,
  sendAgreementRenewalEmail,
  sendRentIncrementEmail,
};
