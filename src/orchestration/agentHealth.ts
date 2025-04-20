/**
 * agentHealth.ts
 * Simple in-memory agent health tracker. Future: Replace with real health checks and monitoring.
 */

export type AgentHealthStatus = 'healthy' | 'unresponsive' | 'crashed' | 'pending' | 'restarting' | 'recovered' | 'recovery_failed';

export class AgentHealthStore {
  private health: Record<string, AgentHealthStatus> = {};
  private listeners: ((agentId: string, status: AgentHealthStatus) => void)[] = [];
  private notificationHooks: ((agentId: string, status: AgentHealthStatus) => void)[] = [];

  setHealth(agentId: string, status: AgentHealthStatus) {
    this.health[agentId] = status;
    this.listeners.forEach(listener => listener(agentId, status));
    this.notificationHooks.forEach(hook => hook(agentId, status));
  }

  getHealth(agentId: string): AgentHealthStatus {
    return this.health[agentId] || 'pending';
  }

  getAll(): Record<string, AgentHealthStatus> {
    return { ...this.health };
  }

  onStatusChange(listener: (agentId: string, status: AgentHealthStatus) => void) {
    this.listeners.push(listener);
  }

  onNotification(hook: (agentId: string, status: AgentHealthStatus) => void) {
    this.notificationHooks.push(hook);
  }
}

// Singleton health store for the app
export const agentHealthStore = new AgentHealthStore();
