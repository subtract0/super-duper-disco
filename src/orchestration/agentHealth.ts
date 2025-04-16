/**
 * agentHealth.ts
 * Simple in-memory agent health tracker. Future: Replace with real health checks and monitoring.
 */

export type AgentHealthStatus = 'healthy' | 'unresponsive' | 'crashed' | 'pending';

export class AgentHealthStore {
  private health: Record<string, AgentHealthStatus> = {};

  setHealth(agentId: string, status: AgentHealthStatus) {
    this.health[agentId] = status;
  }

  getHealth(agentId: string): AgentHealthStatus {
    return this.health[agentId] || 'pending';
  }

  getAll(): Record<string, AgentHealthStatus> {
    return { ...this.health };
  }
}

// Singleton health store for the app
export const agentHealthStore = new AgentHealthStore();
