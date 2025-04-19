// pages/api/agent-logs.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { agentLogStore, AgentLogEntry } from '../../src/orchestration/agentLogs';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Aggregate the 50 most recent logs across all agents
  // AgentLogStore.logs is private, so we need a method to expose all logs
  // We'll add a method to AgentLogStore for this purpose if needed
  // Use the global agentLogStore's logs for live data
  let logs: AgentLogEntry[] = [];
  if (typeof (agentLogStore as any).logs !== 'undefined') {
    logs = (agentLogStore as any).logs;
  } else if (typeof (agentLogStore as any).getAllLogs === 'function') {
    logs = (agentLogStore as any).getAllLogs();
  }
  const sorted = logs.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
  // Format for AgentLogViewer
  const formatted = sorted.map(log => ({
    id: log.agentId,
    timestamp: new Date(log.timestamp).toLocaleString(),
    level: log.level === 'warn' ? 'warning' : log.level,
    message: log.message
  }));
  res.status(200).json({ logs: formatted });
}
