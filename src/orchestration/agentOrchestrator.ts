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
  status: 'pending' | 'healthy' | 'crashed' | 'restarting' | 'recovered' | 'recovery_failed';
  host: string;
  config: AgentInfo['config'];
  lastHeartbeat?: number | null;
  lastActivity?: number | null;
  health?: string;
};

// Helper to map AgentInfo to OrchestratedAgent
function agentInfoToOrchestratedAgent(agent: AgentInfo, forcedStatus?: string): OrchestratedAgent {
  return {
    id: typeof agent.id === 'string' ? agent.id : '',
    type: typeof agent.type === 'string' ? agent.type : 'native',
    status: forcedStatus !== undefined && typeof forcedStatus === 'string'
      ? forcedStatus as OrchestratedAgent['status']
      : (agent.status === 'running' ? 'healthy'
        : agent.status === 'stopped' || agent.status === 'error' ? 'crashed'
        : (['pending', 'healthy', 'crashed', 'restarting', 'recovered', 'recovery_failed'].includes(agent.status as string)
          ? agent.status as OrchestratedAgent['status']
          : 'pending')
      ),
    host:
      agent.config && typeof agent.config === 'object' && agent.config !== null && 'host' in agent.config && typeof (agent.config as any).host === 'string'
        ? (agent.config as any).host
        : 'local',
    config: agent.config ?? {},
    lastHeartbeat: typeof agent.lastHeartbeat === 'number' ? agent.lastHeartbeat : null,
    lastActivity: typeof agent.lastActivity === 'number' ? agent.lastActivity : null,
    health: typeof agent.status === 'string'
      ? (agent.status === 'running' ? 'healthy' : agent.status)
      : undefined,
  };
}

export type AgentMessage = {
  from: string;
  to: string;
  content: any;
  timestamp: number;
};

export type SwarmState = {
  agents: OrchestratedAgent[];
  messages: A2AEnvelope[];
};

/**
 * AgentOrchestrator manages agent lifecycles and orchestration.
 * All methods are async to support future integration with real runtimes.
 */
import { agentLogStore } from './agentLogs';
import { agentHealthStore, AgentHealthStatus } from './agentHealth';
import { agentManager } from './agentManagerSingleton';
import type { AgentInfo } from './agentManager';
import { logAgentHealthToSupabase } from './supabaseAgentOps';
import { sendSlackNotification } from '../utils/notify';

import { QCAgent } from './agents/qcAgent';
import { BuilderAgent } from './agents/builderAgent';
import { buildA2AEnvelope, A2AEnvelope } from '../protocols/a2aAdapter';

type AgentCapability = string;

// Track last notified status per agent (in-memory)
const lastNotifiedStatus: Record<string, AgentHealthStatus> = {};

if (typeof process !== 'undefined' && process.env && process.env.SLACK_WEBHOOK_URL) {
  agentHealthStore.onNotification(async (agentId, status) => {
    if (
      (status === 'crashed' || status === 'unresponsive' || status === 'recovery_failed') &&
      lastNotifiedStatus[agentId] !== status
    ) {
      lastNotifiedStatus[agentId] = status;
      try {
        await sendSlackNotification(
          `:rotating_light: Agent '${agentId}' status changed to *${status}* at ${new Date().toLocaleString()}`,
          process.env.SLACK_WEBHOOK_URL as string
        );
      } catch (err) {
        // Optionally log notification failures
      }
    }
  });
}

export class AgentOrchestrator {
  public readonly instanceId: string;
  constructor(agentManagerInstance?: import('./agentManager').AgentManager, agentMessageMemory?: { save: (msg: Record<string, unknown>) => Promise<void> }) {
    this.instanceId = `${Date.now()}-${Math.floor(Math.random()*1e9)}`;
    // Always use the global singleton for AgentManager
    Object.defineProperty(this, 'agentManager', {
      get: () => (globalThis as any).__CASCADE_AGENT_MANAGER__,
      configurable: true,
      enumerable: true,
    });
    if (agentMessageMemory) {
      this.agentMessageMemory = agentMessageMemory;
    } else {
      this.agentMessageMemory = { save: async () => {} };
    }

    // Future: Load agents from persistent store, initialize orchestrator state
    // Auto-recovery: subscribe to health changes
    const debounce: Record<string, NodeJS.Timeout> = {};
    agentHealthStore.onStatusChange(async (agentId, status) => {
      console.log(`[ORCH][DEBUG] onStatusChange event: ${agentId} -> ${status}`);
      if (status === 'crashed') {
        console.log(`[ORCH] Auto-recovery triggered for ${agentId}`);
        if (debounce[agentId]) clearTimeout(debounce[agentId]);
        debounce[agentId] = setTimeout(async () => {
          console.log(`[ORCH][DEBUG] Debounce timer fired for ${agentId}`);
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

  private agentMessageMemory: { save: (msg: Record<string, unknown>) => Promise<void> };

  /**
   * Registry of agent capabilities for dynamic routing
   * { agentId: ["planner", "researcher", ...] }
   */
  private capabilityRegistry: Record<string, AgentCapability[]> = {};

  /**
   * Dynamic scaling: auto-spawn/stop agents based on workload
   * Call this periodically or on-demand
   */
  async autoscaleAgents(workload: number) {
    const agents = this.listAgents();
    const running = agents.filter(a => a.status === 'healthy');
    const target = Math.max(1, Math.ceil(workload / 5)); // Example: 1 agent per 5 tasks
    if (running.length < target) {
      // Spawn new agents
      for (let i = running.length; i < target; i++) {
        const id = `auto-${Date.now()}-${i}`;
        await this.launchAgent({ id, type: 'autogen', status: 'pending', host: 'local', config: {} });
      }
    } else if (running.length > target) {
      // Stop excess agents
      const toStop = running.slice(target);
      for (const agent of toStop) {
        await this.stopAgent(agent.id);
      }
    }
  }

  /**
   * Stop an agent by ID (calls AgentManager.stopAgent)
   */
  async stopAgent(id: string): Promise<void> {
    if (agentManager && typeof agentManager.stopAgent === 'function') {
      await agentManager.stopAgent(id);
    } else {
      throw new Error('No agentManager instance available to stop agent');
    }
  }

  /**
   * Register agent capabilities for routing
   */
  registerCapabilities(agentId: string, capabilities: AgentCapability[]) {
    this.capabilityRegistry[agentId] = capabilities;
  }

  /**
   * Find agents with a required capability
   */
  findAgentsByCapability(capability: AgentCapability): string[] {
    return Object.entries(this.capabilityRegistry)
      .filter(([_, caps]) => caps.includes(capability))
      .map(([id]) => id);
  }

  /**
   * Delegate a task to an agent with a given capability (multi-agent workflow)
   */
  async delegateTask(capability: AgentCapability, task: Record<string, unknown>, from: string) {
    const candidates = this.findAgentsByCapability(capability);
    if (candidates.length === 0) throw new Error(`No agent with capability: ${capability}`);
    const to = candidates[Math.floor(Math.random() * candidates.length)];
    await this.sendAgentMessage({ from, to, content: task, timestamp: Date.now() });
    return to;
  }
  // All agent state is managed solely via agentManager; do not duplicate agent state here.
  private recoveryAttempts: Record<string, number> = {};
  private maxRecoveryAttempts = 3;
  private recoveryCooldownMs = 2000; // 2 seconds for demo

  /**
   * NOTE: AgentOrchestrator does not maintain its own agent state. All agent lifecycle, health, and logs must be accessed via agentManager.
   */

  /**
   * In-memory agent health/activity map (mirrors AgentManager)
   */
  private agentHealthMap: Record<string, { lastHeartbeat?: number; lastActivity?: number; crashCount?: number }> = {};

  /**
   * In-memory message bus for agent-to-agent communication (stub for swarm/autogen/LangChain integration)
   */
  private messageBus: A2AEnvelope[] = [];

  /**
   * Spawn a swarm of agents (stub for autogen/LangChain integration)
   */
  async spawnSwarm(agentConfigs: OrchestratedAgent[]): Promise<OrchestratedAgent[]> {
    // Future: Use autogen/LangChain to launch and coordinate multiple agents
    const launched = await Promise.all(agentConfigs.map(cfg => this.launchAgent(cfg)));
    return launched;
  }

  /**
   * Send a message from one agent to another using a strict A2A protocol envelope.
   * Ensures protocol compliance and Model Context Protocol (MCP) persistence.
   */
  async sendAgentMessage(msg: AgentMessage): Promise<void> {
    // Build a protocol-compliant A2AEnvelope
    const envelope: A2AEnvelope = buildA2AEnvelope({
      type: 'agent-message',
      from: msg.from,
      to: msg.to,
      body: msg.content,
      threadId: msg.threadId || `${msg.from}->${msg.to}`,
      // Optionally: signature, timestamp, etc.
    });
    // Add to orchestrator message bus
    this.messageBus.push(envelope);

    // Persist as a Model Context Protocol envelope in Supabase for auditability
    try {
      await this.agentMessageMemory.save({
        id: envelope.id,
        type: 'a2a',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        role: 'agent',
        provenance: 'a2a-protocol',
        thread_id: envelope.threadId,
        agent_id: msg.to,
        user_id: msg.from,
        tags: ['a2a', 'protocol', 'agent-message'],
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[Orchestrator][A2A->MCP] Failed to persist A2A message to MCP:', err);
    }
    // Protocol compliance: All agent-to-agent messages must use A2AEnvelope and be MCP-persisted.
  }

  /**
   * Get all messages sent to a particular agent (A2AEnvelope)
   */
  getAgentMessages(agentId: string): A2AEnvelope[] {
    return this.messageBus.filter(m => m.to === agentId);
  }

  /**
   * Helper to extract message body/content for legacy consumers
   */
  extractMessageContent(envelope: A2AEnvelope): unknown {
    return envelope.body;
  }

  /**
   * Get the full swarm state (agents + messages)
   */
  getSwarmState(): SwarmState {
    // Enrich agents with health/activity
    const agentsWithHealth = agentManager.listAgents().map((agent: AgentInfo) => {
      const orch = agentInfoToOrchestratedAgent(agent);
      return {
        ...orch,
        lastHeartbeat: agentManager.getAgentLastHeartbeat(agent.id),
        lastActivity: agentManager.getAgentLastActivity(agent.id),
        health: agentManager.getAgentHealth(agent.id),
      };
    });
    return {
      agents: agentsWithHealth,
      messages: [...this.messageBus],
    };
  }



  /**
   * Launch a Quality Control Agent (QC Agent) for reviewing implementations.
   * @param id QC Agent ID
   * @param openAIApiKey API key for LLM
   */
  async launchQCAgent(id: string, openAIApiKey: string): Promise<QCAgent> {
    const qcAgent = new QCAgent(id, openAIApiKey);
    // Optionally: register QC agent in agentManager for monitoring (future extension)
    // agentManager.deployAgent(id, id, 'qc', { openAIApiKey });
    agentLogStore.addLog({
      agentId: id,
      timestamp: Date.now(),
      level: 'info',
      message: `QC Agent launched: ${id}`,
    });
    return qcAgent;
  }

  /**
   * Review a developer's implementation for a ticket using the QC Agent.
   * @param ticket Ticket description
   * @param implementation Developer's implementation
   * @param openAIApiKey API key for LLM
   * @returns QC Agent's review result
   */
  async reviewWithQC(ticket: string, implementation: string, openAIApiKey: string): Promise<string> {
    const qcAgent = await this.launchQCAgent(`qc-${Date.now()}`, openAIApiKey);
    const review = await qcAgent.reviewImplementation(ticket, implementation);
    return review;
  }

  /**
   * Break down a feature request into development tickets using BuilderAgent.
   * @param request The user's feature request
   * @returns Array of ticket descriptions
   */
  async buildTickets(request: string): Promise<string[]> {
    const builder = new BuilderAgent(`builder-${Date.now()}`);
    const tickets = await builder.receiveRequest(request);
    agentLogStore.addLog({
      agentId: builder.id,
      timestamp: Date.now(),
      level: 'info',
      message: `Builder processed request`,
    });
    return tickets;
  }

  /**
   * Launch a new agent (production: uses agentManager for lifecycle).
   * @param agentConfig OrchestratedAgent-like config
   * @returns OrchestratedAgent
   */
  async launchAgent(agentConfig: {
    id: string;
    type: string;
    status?: string;
    host?: string;
    config?: Record<string, unknown>;
    name?: string;
  }): Promise<OrchestratedAgent> {
    const { id, type, config = {}, name = id } = agentConfig;
    try {
      // Deploy agent using agentManager (ensures BaseAgent/EventEmitter compatibility)
      await agentManager.deployAgent(id, name, type, config);
      // Optionally set host/status if needed
      const info = agentManager.agents.get(id);
      if (!info) throw new Error(`[launchAgent] AgentManager did not register agent id=${id}`);
      // Return as OrchestratedAgent
      return agentInfoToOrchestratedAgent(info);
    } catch (err) {
      // Log error for debugging
      agentLogStore.addLog({
        agentId: id,
        timestamp: Date.now(),
        level: 'error',
        message: `[launchAgent] Failed to launch agent: ${typeof err === 'object' && err !== null && 'message' in err && typeof (err as any).message === 'string' ? (err as any).message : JSON.stringify(err)}`,
      });
      // Optionally log to console
      // eslint-disable-next-line no-console
      console.error('[AgentOrchestrator.launchAgent] Error:', err, (typeof err === 'object' && err !== null && 'stack' in err && typeof (err as any).stack === 'string') ? (err as any).stack : undefined);
      throw err;
    }
  }

  /**
   * Restart an agent if crashed, with retry logic. Sets health to 'restarting' and then 'recovered' or 'recovery_failed'.
   */
  async restartAgent(agentId: string): Promise<'recovered' | 'recovery_failed'> {
    console.log(`[ORCH][DEBUG] restartAgent called for ${agentId}`);
    console.log(`[ORCH] restartAgent called for ${agentId}`);
    let agent = this.getAgent(agentId);
    if (!agent) {
      // Try to hydrate from persistent
      await (await import('./agentManager')).AgentManager.hydrateFromPersistent();
      agent = this.getAgent(agentId);
    }
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
    logAgentHealthToSupabase(agentId, 'restarting', 'Restarting agent', 'warn', { event: 'restartAgent' });
    // Simulate recovery delay
    await new Promise(res => setTimeout(res, this.recoveryCooldownMs));
    // Recovery logic...
    if (this.recoveryAttempts[agentId] === undefined) this.recoveryAttempts[agentId] = 0;
    this.recoveryAttempts[agentId]++;
    if (this.recoveryAttempts[agentId] > this.maxRecoveryAttempts) {
      agentHealthStore.setHealth(agentId, 'recovery_failed');
      console.log(`[ORCH][DEBUG] Health set to recovery_failed for ${agentId}`);
      const failMsg = `Recovery failed after max attempts`;
      agentLogStore.addLog({
        agentId,
        timestamp: Date.now(),
        level: 'error',
        message: failMsg,
      });
      logAgentHealthToSupabase(agentId, 'recovery_failed', failMsg, 'error', { event: 'restartAgent' });
      console.log(`[ORCH] restartAgent: recovery failed for ${agentId}`);
      return 'recovery_failed';
    }
    // Actually restart the agent process using its last config
    try {
      // Use the last known config to re-launch the agent
      try {
        await this.launchAgent({
          id: agent.id,
          type: agent.type,
          status: 'pending',
          host: agent.host,
          config: agent.config || {},
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[restartAgent][ERROR] Failed to relaunch agent:', error, (typeof error === 'object' && error !== null && 'stack' in error && typeof (error as any).stack === 'string') ? (error as any).stack : undefined);
        throw error;
      }
      // Manually set agent status to 'recovered' for test visibility
      const agentInfo = agentManager.agents.get(agentId);
      if (agentInfo) {
        agentInfo.status = 'recovered';
      }
      agentHealthStore.setHealth(agentId, 'recovered');
      console.log(`[ORCH][DEBUG] Health set to recovered for ${agentId}`);
      const okMsg = `Agent recovered successfully`;
      agentLogStore.addLog({
        agentId,
        timestamp: Date.now(),
        level: 'info',
        message: okMsg,
      });
      logAgentHealthToSupabase(agentId, 'recovered', okMsg, 'info', { event: 'restartAgent' });
      console.log(`[ORCH] restartAgent: recovery succeeded for ${agentId}`);
      return 'recovered';
    } catch (err) {
      agentHealthStore.setHealth(agentId, 'recovery_failed');
      const failMsg = `Recovery failed: ${typeof err === 'object' && err && 'message' in err ? (err as any).message : String(err)}`;
      agentLogStore.addLog({
        agentId,
        timestamp: Date.now(),
        level: 'error',
        message: failMsg,
      });
      logAgentHealthToSupabase(agentId, 'recovery_failed', failMsg, 'error', { event: 'restartAgent', error: err });
      console.error(`[ORCH] restartAgent: recovery failed for ${agentId}:`, err);
      return 'recovery_failed';
    }
  }

  /**
   * Get an agent by ID.
   * @param agentId The agent's unique ID
   * @returns The agent, or undefined if not found
   */
  getAgent(agentId: string): OrchestratedAgent | undefined {
    const allIds = Array.from(this.agentManager.agents.keys());
    // eslint-disable-next-line no-console
    console.log('[ORCH][DEBUG][getAgent] instanceId:', this.instanceId, 'all agent IDs:', allIds, 'looking for', agentId, 'typeof agentId:', typeof agentId);
    for (const key of allIds) {
      const keyHex = Buffer.from(key, 'utf8').toString('hex');
      const idHex = Buffer.from(agentId, 'utf8').toString('hex');
      console.log('[ORCH][DEBUG][getAgent] key:', key, 'id:', agentId, 'keyHex:', keyHex, 'idHex:', idHex, 'equal:', key === agentId, 'key.length:', key.length, 'id.length:', agentId.length);
    }
    // Force flush (for Node.js)
    if (process.stdout && process.stdout.write) process.stdout.write('');
    const agentInfo = this.agentManager.agents.get(agentId);
    console.log('[ORCH][DEBUG][getAgent] lookup result:', agentInfo);
    if (!agentInfo) return undefined;
    return agentInfoToOrchestratedAgent(agentInfo);
  }

  /**
   * Get the health status of an agent.
   * @param agentId The agent's unique ID
   * @returns The agent's health status
   */
  getHealth(agentId: string): AgentHealthStatus {
    // Prefer live agentManager status if available
    const info = agentManager.listAgents().find((a: AgentInfo) => a.id === agentId);
    if (info && info.status === 'running') return 'healthy';
    if (info && (info.status === 'stopped' || info.status === 'error')) return 'crashed';
    return agentHealthStore.getHealth(agentId);
  }

  /**
   * List all orchestrated agents.
   * @returns Array of OrchestratedAgent
   */
  listAgents(): OrchestratedAgent[] {
    const allIds = Array.from(this.agentManager.agents.keys());
    // eslint-disable-next-line no-console
    console.log('[ORCH][DEBUG][listAgents] all agent IDs:', allIds);
    return Array.from(this.agentManager.agents.values()).map(agentInfoToOrchestratedAgent);
  }

  reset() {
    agentManager.clearAllAgents();
    

    this.agentHealthMap = {};
    this.messageBus = [];
    this.recoveryAttempts = {};
  }

  /**
   * Update the config of a running agent.
   * Updates the AgentManager's in-memory agent info and, if possible, calls setConfig on the agent instance.
   * Also persists to persistent memory.
   * @param agentId The agent's unique ID
   * @param newConfig The new config object
   * @returns true if successful, false otherwise
   */
  async updateAgentConfig(agentId: string, newConfig: any): Promise<boolean> {
    const info = agentManager.agents.get(agentId);
    if (!info) return false;
    info.config = { ...info.config, ...newConfig };
    // Optionally log config update
    try {
      const mod = await import('./persistentMemory');
      await mod.persistentMemory.save({
        type: 'agent_state',
        content: JSON.stringify({
          id: info.id,
          name: info.name ?? '',
          type: info.type ?? '',
          status: info.status,
          config: info.config,
          logs: info.logs,
          lastHeartbeat: info.lastHeartbeat,
          lastActivity: info.lastActivity,
          crashCount: info.crashCount,
          updatedAt: Date.now(),
        }),
        tags: ['agent', info.type ?? '', info.id, 'config-update'],
      });
    } catch (err) {
      // If persistent memory fails, continue
    }
    return true;
  }
}
