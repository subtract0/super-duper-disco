// Simple file-based persistent agent/host store mock for dev/testing (replace with DB/cloud in prod)
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), '.cascade_data');
const AGENTS_FILE = path.join(DATA_DIR, 'agents.json');
const HOSTS_FILE = path.join(DATA_DIR, 'hosts.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
  if (!fs.existsSync(AGENTS_FILE)) fs.writeFileSync(AGENTS_FILE, '[]');
  if (!fs.existsSync(HOSTS_FILE)) fs.writeFileSync(HOSTS_FILE, '[]');
}

export function getAgents() {
  ensureDataDir();
  return JSON.parse(fs.readFileSync(AGENTS_FILE, 'utf8'));
}
export function saveAgents(agents: any[]) {
  ensureDataDir();
  fs.writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2));
}
export function getHosts() {
  ensureDataDir();
  return JSON.parse(fs.readFileSync(HOSTS_FILE, 'utf8'));
}
export function saveHosts(hosts: any[]) {
  ensureDataDir();
  fs.writeFileSync(HOSTS_FILE, JSON.stringify(hosts, null, 2));
}
