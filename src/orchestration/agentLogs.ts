/**
 * agentLogs.ts
 * Simple in-memory log store for agent events and output.
 * Future: Replace with persistent logging and streaming for production.
 */

export type AgentLogEntry = {
  agentId: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
};

export class AgentLogStore {
  private logs: AgentLogEntry[] = [];

  /**
   * Add a log entry for an agent.
   */
  addLog(entry: AgentLogEntry) {
    this.logs.push(entry);
  }

  /**
   * Get all logs for a specific agent, sorted by timestamp.
   */
  getLogs(agentId: string): AgentLogEntry[] {
    return this.logs
      .filter(log => log.agentId === agentId)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get the latest N logs for an agent.
   */
  getRecentLogs(agentId: string, limit: number = 20): AgentLogEntry[] {
    const logs = this.getLogs(agentId);
    return logs.slice(-limit);
  }
}

// Singleton log store for the app
export const agentLogStore = new AgentLogStore();
