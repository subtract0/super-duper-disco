import ngrok from 'ngrok';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Load .env manually if not loaded
if (!process.env.TELEGRAM_BOT_TOKEN) {
  const dotenvPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(dotenvPath)) {
    const env = fs.readFileSync(dotenvPath, 'utf-8');
    env.split('\n').forEach(line => {
      const [key, ...vals] = line.split('=');
      if (key && vals.length > 0 && !process.env[key]) {
        process.env[key] = vals.join('=');
      }
    });
  }
}

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PORT = process.env.PORT || '3000';

if (!TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN not set in environment.');
}

async function startNgrokAndSetWebhook() {
  // Start ngrok tunnel
  const url = await ngrok.connect({ addr: PORT, authtoken_from_env: true });
  console.log(`[ngrok] Tunnel started: ${url}`);

  // Set Telegram webhook
  const webhookUrl = `${url}/api/telegram`;
  const setWebhookUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`;
  try {
    const resp = await axios.post(setWebhookUrl, { url: webhookUrl });
    if (resp.data && resp.data.ok) {
      console.log(`[ngrok] Telegram webhook set to: ${webhookUrl}`);
    } else {
      console.error(`[ngrok] Failed to set Telegram webhook:`, resp.data);
    }
  } catch (err) {
    console.error(`[ngrok] Error setting Telegram webhook:`, err);
  }
}

if (require.main === module) {
  startNgrokAndSetWebhook();
}

export default startNgrokAndSetWebhook;
