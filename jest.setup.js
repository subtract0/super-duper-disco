// IMPORTANT: Load OpenAI shims BEFORE any other imports or polyfills.
import 'openai/shims/node';

// Polyfill fetch and Web Fetch API types for Node.js test environment (OpenAI/LangChain compatibility)
try {
  const undici = require('undici');
  if (typeof global.fetch !== 'function') global.fetch = undici.fetch;
  if (typeof global.Request !== 'function') global.Request = undici.Request;
  if (typeof global.Response !== 'function') global.Response = undici.Response;
  if (typeof global.Headers !== 'function') global.Headers = undici.Headers;
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('undici not available for fetch polyfill:', e);
}

import '@testing-library/jest-dom';
export {};
