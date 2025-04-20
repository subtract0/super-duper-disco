// Simple notification utility for sending alerts to Slack and email
import fetch from 'node-fetch';

export async function sendSlackNotification(message: string, webhookUrl: string) {
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message })
  });
}

export async function sendEmailNotification(subject: string, body: string, to: string, smtpConfig: any) {
  // Placeholder: Implement using nodemailer or similar
  // Example: await transporter.sendMail({ from, to, subject, text: body });
  return Promise.resolve();
}
