// Automated knowledge ingestion script for agent swarms
// Reads the knowledge/index.yaml and loads all referenced files into a structured context object
// For use at agent/LLM startup

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const KNOWLEDGE_DIR = path.join(__dirname);
const INDEX_PATH = path.join(KNOWLEDGE_DIR, 'index.yaml');

function loadYamlOrMarkdown(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  // Extract YAML frontmatter if present
  const match = content.match(/^---\n([\s\S]+?)---\n/);
  let meta = {};
  let body = content;
  if (match) {
    meta = yaml.load(match[1]);
    body = content.slice(match[0].length);
  }
  return { meta, body };
}

function ingestKnowledge() {
  const index = yaml.load(fs.readFileSync(INDEX_PATH, 'utf-8'));
  const context = { protocols: {}, vision: {}, tasks: {}, history: {}, relationships: index.relationships };
  for (const section of ['protocols', 'vision', 'tasks', 'history']) {
    for (const entry of index[section] || []) {
      const filePath = path.join(KNOWLEDGE_DIR, entry.file);
      if (fs.existsSync(filePath)) {
        context[section][entry.id] = loadYamlOrMarkdown(filePath);
      } else {
        context[section][entry.id] = { meta: {}, body: '' };
      }
    }
  }
  return context;
}

if (require.main === module) {
  try {
    const context = ingestKnowledge();
    console.log('Loaded knowledge context:', JSON.stringify(context, null, 2));
  } catch (err) {
    if (err && err.message && err.message.includes('Cannot use import statement outside a module')) {
      console.error('Knowledge ingestion failed: This script is written in CommonJS (require/module.exports) but is being run as an ES module. Try running with: node knowledge/ingest_knowledge.js (without --experimental-modules or type: "module" in package.json), or convert to ES module syntax.');
    } else {
      console.error('Knowledge ingestion failed:', err.stack || err);
    }
    process.exit(1);
  }
}

module.exports = { ingestKnowledge };
