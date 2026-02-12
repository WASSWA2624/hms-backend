/**
 * Email notification utility
 *
 * Uses SMTP when configured and nodemailer is available.
 * Falls back to no-op delivery (returns false) when unavailable.
 */

const env = require('@config/env');
const { logger } = require('@lib/logging');

let transporter = null;
let nodemailerRef = null;

const STORAGE = {
  UNKNOWN: 'unknown',
  SMTP: 'smtp',
  SKIPPED: 'skipped',
};

const maskEmail = (value) => {
  const raw = String(value || '').trim();
  if (!raw.includes('@')) return '***';
  const [local, domain] = raw.split('@');
  if (!local) return `***@${domain}`;
  const prefix = local.slice(0, 2);
  return `${prefix}***@${domain}`;
};

const canUseSmtp = () =>
  Boolean(
    env.SMTP_HOST &&
      env.SMTP_PORT &&
      env.SMTP_USER &&
      env.SMTP_PASS &&
      env.SMTP_FROM
  );

const getNodemailer = () => {
  if (nodemailerRef !== null) {
    return nodemailerRef;
  }

  try {
    // Optional dependency in local setups.
    // eslint-disable-next-line global-require
    nodemailerRef = require('nodemailer');
  } catch {
    nodemailerRef = false;
  }

  return nodemailerRef;
};

const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  const nodemailer = getNodemailer();
  if (!nodemailer) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: Number(env.SMTP_PORT) === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  return transporter;
};

/**
 * Send email.
 *
 * @param {Object} data - Email payload
 * @param {string|string[]} data.to - Recipient(s)
 * @param {string} data.subject - Email subject
 * @param {string} [data.text] - Plain text body
 * @param {string} [data.html] - HTML body
 * @returns {Promise<{ sent: boolean, provider: string }>}
 */
const sendEmail = async (data) => {
  const to = data?.to;
  const subject = data?.subject;
  const text = data?.text;
  const html = data?.html;

  if (!to || !subject || (!text && !html)) {
    return { sent: false, provider: STORAGE.SKIPPED };
  }

  if (!canUseSmtp()) {
    logger.warn('SMTP not configured; email delivery skipped.', {
      recipient: Array.isArray(to) ? to.map(maskEmail) : maskEmail(to),
      subject,
    });
    return { sent: false, provider: STORAGE.SKIPPED };
  }

  const smtpTransporter = getTransporter();
  if (!smtpTransporter) {
    logger.warn('nodemailer missing; email delivery skipped.', {
      recipient: Array.isArray(to) ? to.map(maskEmail) : maskEmail(to),
      subject,
    });
    return { sent: false, provider: STORAGE.SKIPPED };
  }

  try {
    await smtpTransporter.sendMail({
      from: env.SMTP_FROM,
      to,
      subject,
      text,
      html,
    });

    return { sent: true, provider: STORAGE.SMTP };
  } catch (error) {
    logger.error('Email delivery failed.', {
      recipient: Array.isArray(to) ? to.map(maskEmail) : maskEmail(to),
      subject,
      error: error?.message || 'unknown_error',
    });

    return { sent: false, provider: STORAGE.UNKNOWN };
  }
};

module.exports = {
  sendEmail,
};

