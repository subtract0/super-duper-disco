/**
 * agentHistory.ts
 * Simple in-memory deployment history store for agents. Future: Replace with persistent storage.
 */

export type AgentDeploymentRecord = {
  agentId: string;
  cardName: string;
  timestamp: number;
  host: string;
  config: Record<string, any>;
};

export class AgentHistoryStore {
  private deployments: AgentDeploymentRecord[] = [];

  addDeployment(record: AgentDeploymentRecord) {
    this.deployments.push(record);
  }

  getDeployments(limit: number = 20): AgentDeploymentRecord[] {
    return this.deployments.slice(-limit).reverse();
  }

  getDeploymentsByAgent(agentId: string): AgentDeploymentRecord[] {
    return this.deployments.filter(d => d.agentId === agentId);
  }
}

// Singleton store
export const agentHistoryStore = new AgentHistoryStore();
