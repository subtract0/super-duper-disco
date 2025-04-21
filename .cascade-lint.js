// .cascade-lint.js
// Custom lint rule: Ensure all agent mocks in tests extend BaseAgent or implement EventEmitter

const fs = require('fs');
const path = require('path');

/**
 * Recursively search for test files and check for agent mocks/classes that do not extend BaseAgent or EventEmitter.
 * Prints a warning for each violation.
 */
function checkAgentMocks(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      checkAgentMocks(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.test.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      // Look for class declarations in test files
      const classMatches = [...content.matchAll(/class\s+(\w+)\s+extends\s+([\w.]+)/g)];
      for (const match of classMatches) {
        const [, className, baseClass] = match;
        if (!['BaseAgent', 'EventEmitter'].includes(baseClass)) {
          console.warn(`[LINT][AGENT MOCK] ${fullPath}: ${className} does not extend BaseAgent or EventEmitter`);
        }
      }
      // Look for direct agent mocks (object literals with .on/.emit)
      if (/\{[^}]*on:\s*function[^}]*emit:\s*function[^}]*\}/s.test(content)) {
        // Acceptable, skip
      } else if (/agent.*=\s*\{[^}]*\}/s.test(content)) {
        console.warn(`[LINT][AGENT MOCK] ${fullPath}: agent mock does not implement on/emit (EventEmitter)`);
      }
    }
  }
}

// Run check from project test directory
checkAgentMocks(path.join(__dirname, 'tests'));

module.exports = {};
