// Polyfill fetch for Node.js (needed for OpenAI SDK and other ESM modules)
require('openai/shims/node');

const { TextEncoder, TextDecoder } = require('util');

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
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
