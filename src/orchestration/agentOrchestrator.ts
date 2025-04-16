/**
 * agentOrchestrator.ts
 * Stub for agent orchestration logic using autogen and LangChain.
 * This class will eventually manage agent lifecycles, communication, and task routing.
 *
 * Extension points:
 *   - Integrate with autogen 0.2 and LangChain for real agent process management
 *   - Add monitoring, logging, and error handling
 *   - Support for distributed/remote agent execution
 */

export type OrchestratedAgent = {
  id: string;
  type: string;
  status: 'pending' | 'healthy' | 'crashed';
  host: string;
  config: Record<string, any>;
  // Extend with orchestration/runtime info as needed
};

/**
 * AgentOrchestrator manages agent lifecycles and orchestration.
 * All methods are async to support future integration with real runtimes.
 */
import { agentLogStore } from './agentLogs';
import { agentHealthStore, AgentHealthStatus } from './agentHealth';

export class AgentOrchestrator {
  private recoveryAttempts: Record<string, number> = {};
  private maxRecoveryAttempts = 3;
  private recoveryCooldownMs = 2000; // 2 seconds for demo

  /**
   * In-memory list of orchestrated agents. In production, this should be backed by a DB or distributed store.
   */
  private agents: OrchestratedAgent[] = [];

  constructor() {
    // Future: Load agents from persistent store, initialize orchestrator state
    // Auto-recovery: subscribe to health changes
    const debounce: Record<string, NodeJS.Timeout> = {};
    agentHealthStore.onStatusChange(async (agentId, status) => {
      if (status === 'crashed') {
        console.log(`[ORCH] Auto-recovery triggered for ${agentId}`);
        if (debounce[agentId]) clearTimeout(debounce[agentId]);
        debounce[agentId] = setTimeout(async () => {
          // Only auto-recover if agent still exists and is crashed
          if (this.getAgent(agentId) && agentHealthStore.getHealth(agentId) === 'crashed') {
            agentLogStore.addLog({
              agentId,
              timestamp: Date.now(),
              level: 'warn',
              message: `Auto-recovery triggered for crashed agent`,
            });
            await this.restartAgent(agentId);
          }
        }, 1000); // 1s debounce for demo
      }
    });
  }

  /**
   * Launch a new agent (stubbed; will use autogen/LangChain in future).
   * @param agentConfig OrchestratedAgent configuration
   * @returns The launched agent (with updated status)
   */
  async launchAgent(agentConfig: OrchestratedAgent): Promise<OrchestratedAgent> {
    // Simulate agent launch (future: spawn process, container, etc.)
    const launched: OrchestratedAgent = { ...agentConfig, status: 'healthy' };
    this.agents.push(launched);
    // Add to persistent store
    try {
      const { getAgents, saveAgents } = require('../../../__mocks__/persistentStore');
      const agents = getAgents();
      if (!agents.find((a: any) => a.id === launched.id)) {
        agents.push({ ...launched });
        saveAgents(agents);
      }
    } catch (e) { /* ignore in prod */ }
    agentLogStore.addLog({
      agentId: launched.id,
      timestamp: Date.now(),
      level: 'info',
      message: `Agent launched (type: ${launched.type}, host: ${launched.host})`,
    });
    agentHealthStore.setHealth(launched.id, 'healthy');
    return launched;
  }

  /**
   * Stop an agent (stubbed; will use orchestration APIs in future).
   * @param agentId The agent's unique ID
   */
  async stopAgent(agentId: string): Promise<void> {
    this.recoveryAttempts[agentId] = 0;

    // Simulate stop (future: send kill signal, etc.)
    // Instead of removing, mark as crashed
    const agent = this.getAgent(agentId);
    if (agent) {
      agent.status = 'crashed';
    }
    // Optionally: Remove from persistent store if needed (for demo, keep in memory)
    agentLogStore.addLog({
      agentId,
      timestamp: Date.now(),
      level: 'info',
      message: `Agent stopped`,
    });
    agentHealthStore.setHealth(agentId, 'crashed');
  }


  /**
   * Restart an agent if crashed, with retry logic. Sets health to 'restarting' and then 'recovered' or 'recovery_failed'.
   */
  async restartAgent(agentId: string): Promise<'recovered' | 'recovery_failed'> {
    console.log(`[ORCH] restartAgent called for ${agentId}`);
    const agent = this.getAgent(agentId);
    if (!agent) {
      console.log(`[ORCH] restartAgent: agent ${agentId} not found`);
      return 'recovery_failed';
    }
    if (agentHealthStore.getHealth(agentId) !== 'crashed') {
      console.log(`[ORCH] restartAgent: agent ${agentId} not in crashed state`);
      return 'recovery_failed';
    }
    agentHealthStore.setHealth(agentId, 'restarting');
    console.log(`[ORCH] restartAgent: set health to restarting for ${agentId}`);
    // Simulate recovery delay
    await new Promise(res => setTimeout(res, this.recoveryCooldownMs));
    // Recovery logic...
    if (this.recoveryAttempts[agentId] === undefined) this.recoveryAttempts[agentId] = 0;
    this.recoveryAttempts[agentId]++;
    if (this.recoveryAttempts[agentId] > this.maxRecoveryAttempts) {
      agentHealthStore.setHealth(agentId, 'recovery_failed');
      agentLogStore.addLog({
        agentId,
        timestamp: Date.now(),
        level: 'error',
        message: `Recovery failed after max attempts`,
      });
      console.log(`[ORCH] restartAgent: recovery failed for ${agentId}`);
      return 'recovery_failed';
    }
    // Simulate successful recovery
    agentHealthStore.setHealth(agentId, 'recovered');
    agentLogStore.addLog({
      agentId,
      timestamp: Date.now(),
      level: 'info',
      message: `Agent recovered successfully`,
    });
    console.log(`[ORCH] restartAgent: recovery succeeded for ${agentId}`);
    return 'recovered';
  }

  /**
   * Get an agent by ID.
   * @param agentId The agent's unique ID
   * @returns The agent, or undefined if not found
   */
  getAgent(agentId: string): OrchestratedAgent | undefined {
    return this.agents.find((a: OrchestratedAgent) => a.id === agentId);
  }

  /**
   * Get the health status of an agent.
   * @param agentId The agent's unique ID
   * @returns The agent's health status
   */
  getHealth(agentId: string): AgentHealthStatus {
    return agentHealthStore.getHealth(agentId);
  }

  /**
   * List all orchestrated agents.
   * @returns Array of OrchestratedAgent
   */
  listAgents(): OrchestratedAgent[] {
    return [...this.agents];
  }
}
