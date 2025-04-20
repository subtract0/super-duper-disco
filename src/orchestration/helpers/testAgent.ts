// Utility for seeding logs in agents during tests, using the public log method
export function seedLogs(agent: { log: (msg: string) => void }, lines: string[]) {
  lines.forEach(msg => agent.log(msg));
}
