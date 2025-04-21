// archive_plan_plateaus.js
// Automate migration of plateau/debugging/history sections from PLAN.md to PLAN-past.md
// Usage: node scripts/archive_plan_plateaus.js [--dry-run]
// Run this after each major plateau or when PLAN.md grows too long.

const fs = require('fs');
const path = require('path');

const PLAN = path.join(__dirname, '..', 'PLAN.md');
const PLAN_PAST = path.join(__dirname, '..', 'PLAN-past.md');
const ARCHIVE_MARKER = '# Archived PLAN.md Content (migrated ' + new Date().toISOString().replace('T', ' ').slice(0, 16) + ')';
const CUTOFF_MARKERS = [
  /^# Archived PLAN\.md Content/, // migration notice
  /^# Plateau Archive Cutoff/     // optional manual cutoff
];

function findCutoff(lines) {
  for (let i = 0; i < lines.length; ++i) {
    for (const re of CUTOFF_MARKERS) {
      if (re.test(lines[i])) return i + 1;
    }
  }
  return lines.length;
}

function archivePlateaus({dryRun = false} = {}) {
  const planContent = fs.readFileSync(PLAN, 'utf8');
  const pastContent = fs.readFileSync(PLAN_PAST, 'utf8');
  const lines = planContent.split(/\r?\n/);
  const cutoff = findCutoff(lines);
  const toArchive = lines.slice(cutoff).join('\n').trim();

  if (!toArchive) {
    console.log('Nothing to archive. PLAN.md is already concise!');
    console.log('Tip: Run this script after each major plateau/debugging session.');
    return;
  }

  const archiveBlock = `\n${ARCHIVE_MARKER}\n\n${toArchive}\n`;
  const newPlan = lines.slice(0, cutoff).join('\n').replace(/\n+$/, '\n');

  if (dryRun) {
    console.log('--- DRY RUN: Plateau archival preview ---');
    console.log('Would append to PLAN-past.md:\n', archiveBlock);
    console.log('Would trim PLAN.md to:\n', newPlan);
    return;
  }

  fs.appendFileSync(PLAN_PAST, archiveBlock, 'utf8');
  fs.writeFileSync(PLAN, newPlan, 'utf8');

  console.log('✅ Plateau/debugging sections archived to PLAN-past.md and PLAN.md trimmed.');
  console.log('Tip: You can run this script after any plateau, debugging session, or when PLAN.md grows too long.');
  console.log('Discoverable in PLAN.md and the Cascade Protocol.');
}

// CLI entry point
if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  archivePlateaus({dryRun});
}
