import { AgentManager } from '../agentManager';
import { MessageBus } from './bus';
import { OrchestratedAgent, SwarmState, AgentMessage } from './types';

export class AgentOrchestrator {
  private readonly mgr: AgentManager;
  private readonly bus: MessageBus;
  private readonly now: () => number;
  private readonly maxRecovery: number;

  constructor(mgr: AgentManager, bus: MessageBus, opts?: { now?: () => number; maxRecovery?: number }) {
    this.mgr = mgr;
    this.bus = bus;
    this.now = opts?.now ?? (() => Date.now());
    this.maxRecovery = opts?.maxRecovery ?? 5;
  }

  getSwarmState(): SwarmState {
    // Example: returns live state of all agents
    return {
      agents: Array.from(this.mgr.agents.values()).map(agent => ({
        id: agent.id,
        type: agent.type ?? 'native',
        status: agent.status as OrchestratedAgent['status'],
        host: 'localhost',
        config: agent.config ?? {},
        deploymentStatus: agent.deploymentStatus ?? null,
        deploymentUrl: agent.deploymentUrl ?? null,
        lastDeploymentError: agent.lastDeploymentError ?? null,
      })),
      messages: this.bus.list(),
    };
  }

  stopAgent(id: string): string {
    this.mgr.stopAgent(id);
    return 'stopped';
  }

  restartAgent(id: string): string {
    this.mgr.stopAgent(id);
    this.mgr.deployAgent(id, 'unknown', 'native', {});
    return 'restarted';
  }

  /**
   * Send an agent-to-agent message (publishes to in-memory MessageBus)
   */
  async sendAgentMessage(msg: AgentMessage): Promise<void> {
    try {
      this.bus.publish(msg);
    } catch (err) {
      // Log error for debugging
      // eslint-disable-next-line no-console
      console.error('[AgentOrchestrator] sendAgentMessage error:', err);
      throw err;
    }
  }

  /**
   * Return all messages for a given agent id (to)
   */
  getAgentMessages(agentId: string): AgentMessage[] {
    return this.bus.byReceiver(agentId);
  }
}
