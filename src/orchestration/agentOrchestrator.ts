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
  config: Record<string, any>;
  // Extend with orchestration/runtime info as needed
};

export type AgentMessage = {
  from: string;
  to: string;
  content: any;
  timestamp: number;
};

export type SwarmState = {
  agents: OrchestratedAgent[];
  messages: AgentMessage[];
};

/**
 * AgentOrchestrator manages agent lifecycles and orchestration.
 * All methods are async to support future integration with real runtimes.
 */
import { agentLogStore } from './agentLogs';
import { agentHealthStore, AgentHealthStatus } from './agentHealth';
import { agentManager } from './agentManager';
import { logAgentHealthToSupabase } from './supabaseAgentOps';

import { QCAgent } from './agents/qcAgent';
import { BuilderAgent } from './agents/builderAgent';

export class AgentOrchestrator {
  private agents: OrchestratedAgent[] = []; // Always initialize as empty array
  private recoveryAttempts: Record<string, number> = {};
  private maxRecoveryAttempts = 3;
  private recoveryCooldownMs = 2000; // 2 seconds for demo

  /**
   * In-memory list of orchestrated agents. In production, this should be backed by a DB or distributed store.
   */
  // Agents are now managed solely via agentManager; no in-memory duplication here.

  /**
   * In-memory agent health/activity map (mirrors AgentManager)
   */
  private agentHealthMap: Record<string, { lastHeartbeat?: number; lastActivity?: number; crashCount?: number }> = {};

  /**
   * In-memory message bus for agent-to-agent communication (stub for swarm/autogen/LangChain integration)
   */
  private messageBus: AgentMessage[] = [];

  /**
   * Spawn a swarm of agents (stub for autogen/LangChain integration)
   */
  async spawnSwarm(agentConfigs: OrchestratedAgent[]): Promise<OrchestratedAgent[]> {
    // Future: Use autogen/LangChain to launch and coordinate multiple agents
    const launched = await Promise.all(agentConfigs.map(cfg => this.launchAgent(cfg)));
    return launched;
  }

  /**
   * Send a message from one agent to another (stub for agent communication)
   */
  async sendAgentMessage(msg: AgentMessage): Promise<void> {
    // Future: Use autogen/LangChain or distributed message bus
    this.messageBus.push({ ...msg, timestamp: Date.now() });
  }

  /**
   * Get all messages sent to a particular agent
   */
  getAgentMessages(agentId: string): AgentMessage[] {
    return this.messageBus.filter(m => m.to === agentId);
  }

  /**
   * Get the full swarm state (agents + messages)
   */
  getSwarmState(): SwarmState {
    // Enrich agents with health/activity
    const { agentManager } = require('./agentManager');
    const agentsWithHealth = agentManager.listAgents().map(agent => ({
      ...agent,
      lastHeartbeat: agentManager.getAgentLastHeartbeat(agent.id),
      lastActivity: agentManager.getAgentLastActivity(agent.id),
      health: agentManager.getAgentHealth(agent.id),
    }));
    return {
      agents: agentsWithHealth,
      messages: [...this.messageBus],
    };
  }

  constructor() {
    this.agents = []; // Defensive: ensure always initialized
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
   * Launch a new agent (stubbed; will use autogen/LangChain in future).
   * @param agentConfig OrchestratedAgent configuration
   * @returns The launched agent (with updated status)
   */
  async launchAgent(agentConfig: OrchestratedAgent): Promise<OrchestratedAgent> {
    // Use agentManager.deployAgent for real agent process
    const { agentManager } = require('./agentManager');
    agentManager.deployAgent(agentConfig.id, agentConfig.id, agentConfig.type, agentConfig.config);
    const agentHealth = {
      lastHeartbeat: agentManager.getAgentLastHeartbeat(agentConfig.id),
      lastActivity: agentManager.getAgentLastActivity(agentConfig.id),
      crashCount: 0,
    };
    this.agentHealthMap[agentConfig.id] = agentHealth;
    const agent: OrchestratedAgent = {
      ...agentConfig,
      status: 'healthy',
      host: 'local',
    };
    this.agents.push(agent);
    const logMsg = `Agent launched: ${agent.id}`;
    agentLogStore.addLog({
      agentId: agent.id,
      timestamp: Date.now(),
      level: 'info',
      message: logMsg,
    });
    // Persist to Supabase
    logAgentHealthToSupabase(agent.id, 'healthy', logMsg, 'info', { event: 'launchAgent' });
    return agent;
  }

  /**
   * Stop an agent (stubbed; will use orchestration APIs in future).
   * @param agentId The agent's unique ID
   */
  async stopAgent(agentId: string): Promise<void> {
    this.recoveryAttempts[agentId] = 0;
    // Stop the real agent process
    agentManager.stopAgent(agentId);
    // Mark as crashed for compatibility
    const agent = this.getAgent(agentId);
    if (agent) {
      agent.status = 'crashed';
      // Do NOT remove agent from orchestrator's agent list; keep it for status tracking
    }
    const logMsg = `Agent stopped`;
    agentLogStore.addLog({
      agentId,
      timestamp: Date.now(),
      level: 'info',
      message: logMsg,
    });
    logAgentHealthToSupabase(agentId, 'crashed', logMsg, 'info', { event: 'stopAgent' });
    agentHealthStore.setHealth(agentId, 'crashed');
  }

  /**
   * Restart an agent if crashed, with retry logic. Sets health to 'restarting' and then 'recovered' or 'recovery_failed'.
   */
  async restartAgent(agentId: string): Promise<'recovered' | 'recovery_failed'> {
    console.log(`[ORCH][DEBUG] restartAgent called for ${agentId}`);
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
    // Simulate successful recovery
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
    // Prefer live agentManager status if available
    const info = agentManager.listAgents().find(a => a.id === agentId);
    if (info && info.status === 'running') return 'healthy';
    if (info && info.status === 'stopped') return 'crashed';
    return agentHealthStore.getHealth(agentId);
  }

  /**
   * List all orchestrated agents.
   * @returns Array of OrchestratedAgent
   */
  listAgents(): OrchestratedAgent[] {
    const { agentManager } = require('./agentManager');
    return this.agents.map(agent => ({
      ...agent,
      lastHeartbeat: agentManager.getAgentLastHeartbeat(agent.id),
      lastActivity: agentManager.getAgentLastActivity(agent.id),
      health: agentManager.getAgentHealth(agent.id),
    }));
  }

  /**
   * Reset orchestrator state for test isolation.
   * Clears all agents, health/activity maps, and message bus.
   */
  reset() {
    const { agentManager } = require('./agentManager');
    agentManager.clearAllAgents();
    this.agents = [];
    if (!Array.isArray(this.agents)) this.agents = [];
    this.agentHealthMap = {};
    this.messageBus = [];
    this.recoveryAttempts = {};
  }
}
