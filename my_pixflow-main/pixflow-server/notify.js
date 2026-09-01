import { Resend } from 'resend';

// ─────────────────────────────────────────────────────────────────────────
// Email notifications for new contact/order messages.
//
// Uses Resend's free tier (100 emails/day, no credit card). Sends from
// Resend's shared test address (onboarding@resend.dev) so it works
// immediately with zero DNS/domain setup — good enough for an internal
// "you've got a new message" alert to the site owner.
//
// If RESEND_API_KEY isn't set, notifications are silently skipped (the
// message is still saved to the database either way — email is a
// best-effort convenience, never a requirement for the form to work).
// ─────────────────────────────────────────────────────────────────────────

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || process.env.ADMIN_EMAIL;

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export async function notifyNewMessage({ name, email, subject, message }) {
  if (!resend || !NOTIFY_EMAIL) return; // not configured — skip quietly

  try {
    await resend.emails.send({
      from: 'Pixflow Notifications <onboarding@resend.dev>',
      to: NOTIFY_EMAIL,
      reply_to: email,
      subject: `New message: ${subject || '(no subject)'}`,
      text:
        `New message received on your website.\n\n` +
        `From: ${name} <${email}>\n` +
        `Subject: ${subject || '(no subject)'}\n\n` +
        `${message}\n\n` +
        `---\nReply directly to this email to respond to ${name}, or view it in your admin panel.`,
    });
  } catch (err) {
    // Never let an email failure break the form submission itself.
    console.error('Email notification failed:', err.message);
  }
}
