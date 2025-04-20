// Re-export createTelegramHandler for testing
let createTelegramHandler: any;
try {
  const mod = require('./telegram');
  createTelegramHandler = mod.createTelegramHandler;
} catch (error) {
  console.error('[Telegram][EXPORTS] Import error:', error);
  throw error;
}
export { createTelegramHandler };
export default createTelegramHandler;
