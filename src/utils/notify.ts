// Simple notification utility for sending alerts to Slack and email
import fetch from 'node-fetch';

export async function sendSlackNotification(message: string, webhookUrl: string) {
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message })
  });
}

/**
 * Placeholder for email notification. Implement using nodemailer or similar.
 * @param subject - Email subject
 * @param body - Email body
 * @param to - Recipient address
 * @param smtpConfig - SMTP configuration (unused)
 */
export async function sendEmailNotification(
  subject: string,
  body: string,
  to: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  smtpConfig: unknown
): Promise<void> {
  // Example: await transporter.sendMail({ from, to, subject, text: body });
  return Promise.resolve();
}
