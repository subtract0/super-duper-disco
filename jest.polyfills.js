// Polyfill fetch for Node.js (needed for OpenAI SDK and other ESM modules)
import 'openai/shims/node';

const { TextEncoder, TextDecoder } = require('util');

if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = TextDecoder;
}

// Polyfill ReadableStream for Node.js tests (used by langchain/openai)
if (typeof global.ReadableStream === 'undefined') {
  try {
    global.ReadableStream = require('stream/web').ReadableStream;
  } catch (e) {
    // Node <18 fallback: minimal stub
    global.ReadableStream = class {};
  }
}
// If you need other polyfills, add them here.
