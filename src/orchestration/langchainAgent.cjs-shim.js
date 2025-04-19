// CommonJS shim for dynamic require compatibility
// eslint-disable-next-line @typescript-eslint/no-require-imports
// CommonJS shim for dynamic require compatibility
// Directly require TypeScript source for Next.js compatibility
const path = require('path');
const { LangChainAgent } = require(path.join(process.cwd(), 'src', 'orchestration', 'langchainAgent.js'));
module.exports = { LangChainAgent };
