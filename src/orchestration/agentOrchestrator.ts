/**
 * agentOrchestrator.ts
 * Manages agent lifecycles, communication, task routing, recovery, and scaling above AgentManager.
 * Integrates with external systems like autogen, LangChain, logging, health monitoring, and persistence.
 */
import type { AgentInfo, AgentStatus as ManagerAgentStatus } from './agentManager'; // Renamed AgentStatus to avoid name clash
import { agentManager } from './agentManagerSingleton'; // Use the singleton instance getter
import { agentLogStore } from './agentLogs';

// Helper function to ensure all logs have a timestamp
function addLogWithTimestamp(entry: Omit<Parameters<typeof agentLogStore.addLog>[0], 'timestamp'> & { timestamp?: number }) {
  if (!entry.timestamp) {
    entry.timestamp = Date.now();
  }
  agentLogStore.addLog(entry as any);
}

import { agentHealthStore, AgentHealthStatus } from './agentHealth'; // Assuming AgentHealthStatus is defined here
import { logAgentHealthToSupabase } from './supabaseAgentOps';
import { sendSlackNotification } from '../utils/notify';
import { QCAgent } from './agents/qcAgent';
import { BuilderAgent } from './agents/builderAgent';
import { buildA2AEnvelope, A2AEnvelope } from '../protocols/a2aAdapter';
import type { BaseAgent } from './agents/BaseAgent'; // Import BaseAgent for type assertion if needed

// --- Types ---

export type OrchestratedAgentStatus = 'pending' | 'healthy' | 'crashed' | 'restarting' | 'recovered' | 'recovery_failed' | 'unknown';

export type OrchestratedAgent = {
  id: string;
  name: string;
  type: string;
  status: OrchestratedAgentStatus;
  host: string;
  config: AgentInfo['config'];
  lastHeartbeat?: number | null;
  lastActivity?: number | null;
  // 'health' field removed, 'status' is the primary indicator
};

export interface AgentMessage {
  from: string;
  to: string;
  content: any;
  timestamp: number;
  threadId?: string;
}

export type SwarmState = {
  agents: OrchestratedAgent[];
  messages: A2AEnvelope[];
};

type AgentCapability = string;

// --- Configuration Defaults ---

const DEFAULT_MAX_RECOVERY_ATTEMPTS = 3;
const DEFAULT_RECOVERY_COOLDOWN_MS = 2000;
const DEFAULT_RECOVERY_DEBOUNCE_MS = 1000;
const DEFAULT_AUTOSCALE_FACTOR = 5; // Example: 1 agent per 5 tasks/workload units

// --- Options Interface ---

export interface AgentOrchestratorOptions {
  maxRecoveryAttempts?: number;
  recoveryCooldownMs?: number;
  recoveryDebounceMs?: number;
  autoscaleAgentFactor?: number;
  slackWebhookUrl?: string; // Allow passing webhook URL via options
}

// --- Helper Function ---

// Maps AgentInfo from AgentManager to the Orchestrator's view
function agentInfoToOrchestratedAgent(agentInfo: AgentInfo, forcedStatus?: OrchestratedAgentStatus): OrchestratedAgent {
  // Define mapping from AgentManager status to Orchestrator status
  const statusMap: { [key in ManagerAgentStatus]?: OrchestratedAgentStatus } = {
    running: 'healthy',
    stopped: 'crashed',
    error: 'crashed',
    recovered: 'recovered', // Keep 'recovered' distinct temporarily post-recovery
    recovery_failed: 'recovery_failed',
    pending: 'pending',
    deploying: 'pending', // Treat deploying as pending
    // 'deployed' status from AgentManager isn't mapped here, assumed it transitions quickly to running/pending
  };

  let currentStatus: OrchestratedAgentStatus;
  if (forcedStatus) {
    currentStatus = forcedStatus;
  } else {
    currentStatus = statusMap[agentInfo.status] ?? 'unknown'; // Default if status is unexpected
  }

  // Safer host extraction from config
  let host = 'local';
  if (agentInfo.config && typeof agentInfo.config.host === 'string') {
    host = agentInfo.config.host;
  }

  return {
    id: agentInfo.id,
    name: agentInfo.name ?? agentInfo.id, // Use name if available
    type: agentInfo.type ?? 'native',
    status: currentStatus,
    host: host,
    config: agentInfo.config ?? {},
    lastHeartbeat: agentInfo.lastHeartbeat ?? null,
    lastActivity: agentInfo.lastActivity ?? null,
  };
}

// --- Orchestrator Class ---

export class AgentOrchestrator {
  /**
   * Retrieve an agent by ID, always querying AgentManager for the latest state.
   */
  async getAgent(id: string): Promise<OrchestratedAgent | undefined> {
    addLogWithTimestamp({ agentId: id, level: 'info', message: `[Orchestrator.getAgent] Looking up agent in AgentManager: ${id}` });
    const agentInfo = await this.agentManager.findAgentById(id);
    if (!agentInfo) {
      addLogWithTimestamp({ agentId: id, level: 'info', message: `[Orchestrator.getAgent] Agent not found in AgentManager: ${id}` });
      return undefined;
    }
    addLogWithTimestamp({ agentId: id, level: 'info', message: `[Orchestrator.getAgent] Agent found: ${id}, status=${agentInfo.status}` });
    return agentInfoToOrchestratedAgent(agentInfo);
  }

  // Use a getter for the AgentManager singleton for clarity
  public get agentManager(): import('./agentManager').AgentManager {
    // Access the global singleton ensured by agentManagerSingleton.ts
    const manager = (globalThis as any).__CASCADE_AGENT_MANAGER__;
    if (!manager) {
        // This should ideally not happen if singleton is initialized correctly
        throw new Error("AgentManager singleton instance not found on globalThis.");
    }
    return manager;
  }

  public readonly instanceId: string;
  private readonly options: Required<Omit<AgentOrchestratorOptions, 'slackWebhookUrl'>> & { slackWebhookUrl?: string }; // Make internal options required except optional webhook
  private agentMessageMemory: { save: (msg: Record<string, unknown>) => Promise<void> };

  // Orchestrator-specific state
  private capabilityRegistry: Record<string, AgentCapability[]> = {};
  private messageBus: A2AEnvelope[] = [];
  private recoveryAttempts: Record<string, number> = {};

  constructor(
      options: AgentOrchestratorOptions = {},
      agentMessageMemory?: { save: (msg: Record<string, unknown>) => Promise<void> }
    ) {
    this.instanceId = `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;

    // Store merged options with defaults
    this.options = {
      maxRecoveryAttempts: options.maxRecoveryAttempts ?? DEFAULT_MAX_RECOVERY_ATTEMPTS,
      recoveryCooldownMs: options.recoveryCooldownMs ?? DEFAULT_RECOVERY_COOLDOWN_MS,
      recoveryDebounceMs: options.recoveryDebounceMs ?? DEFAULT_RECOVERY_DEBOUNCE_MS,
      autoscaleAgentFactor: options.autoscaleAgentFactor ?? DEFAULT_AUTOSCALE_FACTOR,
      slackWebhookUrl: options.slackWebhookUrl ?? process.env.SLACK_WEBHOOK_URL, // Prioritize option over env var
    };

    // Setup message memory (default to no-op if not provided)
    this.agentMessageMemory = agentMessageMemory ?? { save: async () => {} };

    this.setupHealthMonitoring();
    this.setupSlackNotifications();

    addLogWithTimestamp({ agentId: 'orchestrator', level: 'info', message: `Orchestrator instance ${this.instanceId} initialized.` });
  }

  private setupSlackNotifications(): void {
    if (!this.options.slackWebhookUrl) {
        addLogWithTimestamp({ agentId: 'orchestrator', level: 'info', message: 'Slack notifications disabled (no webhook URL configured).' });
        return; // Do nothing if webhook URL is not configured
    }

    const webhookUrl = this.options.slackWebhookUrl; // Capture for closure
    const lastNotifiedStatus: Record<string, AgentHealthStatus> = {}; // Track notifications per agent

    agentHealthStore.onNotification(async (agentId, status) => {
      const isCriticalStatus = ['crashed', 'unresponsive', 'recovery_failed'].includes(status);

      if (isCriticalStatus && lastNotifiedStatus[agentId] !== status) {
        lastNotifiedStatus[agentId] = status; // Update last notified status
        try {
          addLogWithTimestamp({ agentId: 'orchestrator', level: 'warn', message: `Sending Slack notification for agent ${agentId} status: ${status}` });
          await sendSlackNotification(
            `:rotating_light: Agent '${agentId}' status changed to *${status}* at ${new Date().toLocaleString()}`,
            webhookUrl
          );
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          addLogWithTimestamp({ agentId: 'orchestrator', level: 'error', message: `Failed to send Slack notification for ${agentId}: ${errorMsg}` });
        }
      } else if (!isCriticalStatus && lastNotifiedStatus[agentId] && isCriticalStatus) {
         // Optional: Clear notification status if agent recovers or is stopped cleanly
         delete lastNotifiedStatus[agentId];
      }
    });
     addLogWithTimestamp({ agentId: 'orchestrator', level: 'info', message: `Slack notifications enabled.` });
  }

  private setupHealthMonitoring(): void {
    const debounceTimeouts: Record<string, NodeJS.Timeout> = {};

    agentHealthStore.onStatusChange(async (agentId, status) => {
      addLogWithTimestamp({ agentId: 'orchestrator', level: 'info', message: `Received onStatusChange event: ${agentId} -> ${status}` });

      if (status === 'crashed') {
        addLogWithTimestamp({ agentId: 'orchestrator', level: 'warn', message: `Auto-recovery trigger condition met for agent ${agentId}. Debouncing...` });

        if (debounceTimeouts[agentId]) {
            clearTimeout(debounceTimeouts[agentId]);
        }

        debounceTimeouts[agentId] = setTimeout(async () => {
          try {
            addLogWithTimestamp({ agentId: 'orchestrator', level: 'info', message: `Debounce timer fired for agent ${agentId}. Starting recovery check.` });
            // Re-check the agent's status directly via AgentManager before attempting recovery
            const liveStatus = this.agentManager.getAgentHealth(agentId);
            const agentInfo = await this.agentManager.findAgentById(agentId); // Get full info for restart

            if (agentInfo && liveStatus === 'error') { // Use 'error' status from AgentManager which triggers 'crashed' in healthStore
              agentLogStore.addLog({
                agentId: agentId, // Log belongs to the specific agent
                timestamp: Date.now(),
                level: 'warn',
                message: `Auto-recovery process starting for crashed agent.`,
              });
              await this.restartAgent(agentId, agentInfo); // Pass agentInfo to avoid re-fetching
            } else {
               addLogWithTimestamp({ agentId: 'orchestrator', level: 'info', message: `Auto-recovery for ${agentId} aborted. Agent not found or status is no longer 'error' (current: ${liveStatus}).` });
            }
          } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              addLogWithTimestamp({ agentId: 'orchestrator', level: 'error', message: `Error during auto-recovery debounce callback for ${agentId}: ${errorMsg}` });
          } finally {
               delete debounceTimeouts[agentId]; // Clean up timeout reference
          }
        }, this.options.recoveryDebounceMs);
      } else if (debounceTimeouts[agentId]) {
           // If status changes from crashed to something else before debounce fires, cancel recovery
           addLogWithTimestamp({ agentId: 'orchestrator', level: 'info', message: `Agent ${agentId} status changed to ${status} before recovery debounce, canceling recovery attempt.` });
           clearTimeout(debounceTimeouts[agentId]);
           delete debounceTimeouts[agentId];
      }
    });
  }


  /**
   * Register agent capabilities for routing.
   */
  registerCapabilities(agentId: string, capabilities: AgentCapability[]): void {
    this.capabilityRegistry[agentId] = capabilities;
    addLogWithTimestamp({ agentId: 'orchestrator', level: 'info', message: `Registered capabilities for ${agentId}: ${capabilities.join(', ')}` });
  }

  /**
   * Find agents with a required capability.
   */
  findAgentsByCapability(capability: AgentCapability): string[] {
    return Object.entries(this.capabilityRegistry)
      .filter(([_, caps]) => caps.includes(capability))
      .map(([id]) => id);
  }

  /**
   * Delegate a task to an agent with a given capability.
   */
  async delegateTask(capability: AgentCapability, task: Record<string, unknown>, from: string): Promise<string> {
    const candidates = this.findAgentsByCapability(capability);
    if (candidates.length === 0) {
        throw new Error(`No agent found with capability: ${capability}`);
    }
    // Simple random selection for now, could be more sophisticated (load balancing, etc.)
    const to = candidates[Math.floor(Math.random() * candidates.length)];
    addLogWithTimestamp({ agentId: 'orchestrator', level: 'info', message: `Delegating task requiring '${capability}' from ${from} to ${to}.` });
    await this.sendAgentMessage({ from, to, content: task, timestamp: Date.now() });
    return to;
  }

  /**
   * Send a message from one agent to another using A2A protocol envelope.
   */
  async sendAgentMessage(msg: AgentMessage): Promise<void> {
    const envelope: A2AEnvelope = buildA2AEnvelope({
      type: 'agent-message',
      from: msg.from,
      to: msg.to,
      body: msg.content,
      threadId: msg.threadId || `${msg.from}->${msg.to}-${Date.now()}`, // Ensure unique thread ID if not provided
    });

    this.messageBus.push(envelope); // Add to in-memory bus for local delivery simulation

    // Persist for auditability/MCP
    try {
      await this.agentMessageMemory.save({
        id: envelope.id, // Use envelope's unique ID
        type: 'a2a',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        role: 'agent', // Role of the *recipient* in context of MCP? Clarify needed. Assume agent.
        provenance: 'a2a-protocol',
        thread_id: envelope.threadId,
        agent_id: msg.to, // Target agent
        user_id: msg.from, // Origin agent/user
        tags: ['a2a', 'protocol', 'agent-message', `from:${msg.from}`, `to:${msg.to}`], // Add useful tags
        created_at: new Date().toISOString(),
      });
      addLogWithTimestamp({ agentId: 'orchestrator', level: 'info', message: `A2A message ${envelope.id} persisted to MCP.` });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      addLogWithTimestamp({ agentId: 'orchestrator', level: 'error', message: `[A2A->MCP] Failed to persist A2A message ${envelope.id}: ${errorMsg}` });
      // Decide if failure to persist should prevent message sending or just be logged
    }

    // Future: Actually deliver the message to the target agent instance (e.g., via WebSocket, queue, direct call)
    addLogWithTimestamp({ agentId: 'orchestrator', level: 'info', message: `A2A message ${envelope.id} from ${msg.from} to ${msg.to} queued/sent.` });
  }

  /**
   * Get all messages (A2AEnvelopes) sent TO a particular agent (from in-memory bus).
   */
  getAgentMessages(agentId: string): A2AEnvelope[] {
    // Note: This only gets messages currently in the in-memory bus.
    // A real implementation might query persistent storage or a message queue.
    return this.messageBus.filter(m => m.to === agentId);
  }

   /**
    * Helper to extract message body/content for legacy consumers.
    * @deprecated Prefer processing the full A2AEnvelope.
    */
   extractMessageContent(envelope: A2AEnvelope): unknown {
     return envelope.body;
   }


  /**
   * Launch a new agent using AgentManager.
   */
  async launchAgent(agentConfig: {
    id: string;
    name?: string; // Make name optional, default to id
    type: string;
    config?: Record<string, unknown>;
    // Removed status, host - these are managed/derived, not launch params
  }): Promise<OrchestratedAgent> {
    const { id, name = id, type, config = {} } = agentConfig;
    addLogWithTimestamp({ agentId: 'orchestrator', level: 'info', message: `[launchAgent] Received agentConfig: id=${id}, name=${name}, type=${type}, config=${JSON.stringify(config)}` });
    try {
      // Explicit debug log for type propagation
      addLogWithTimestamp({ agentId: 'orchestrator', level: 'info', message: `[launchAgent] Passing to AgentManager.deployAgent: id=${id}, name=${name}, type=${type}` });
      // Delegate deployment to AgentManager
      await this.agentManager.deployAgent(id, name, type, config);

      // Retrieve the authoritative AgentInfo after deployment attempt
      const agentInfo = await this.agentManager.findAgentById(id); // Use async getter to ensure latest state
      if (!agentInfo) {
        // This indicates a problem within deployAgent or state consistency
        throw new Error(`AgentManager failed to provide AgentInfo for id=${id} after deployment call.`);
      }

      addLogWithTimestamp({ agentId: 'orchestrator', level: 'info', message: `Agent ${id} launched successfully via AgentManager (current status: ${agentInfo.status}).` });
      // Map to the orchestrator's view
      return agentInfoToOrchestratedAgent(agentInfo);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      agentLogStore.addLog({
        agentId: id, // Log associated with the agent being launched
        timestamp: Date.now(),
        level: 'error',
        message: `Failed to launch agent: ${errorMsg}`,
        data: { stack } // Include stack in structured data
      });
      console.error(`[AgentOrchestrator.launchAgent] Error launching ${id}:`, err); // Keep console error for visibility
      throw err; // Re-throw to signal failure
    }
  }

  /**
   * Stop or delete an agent by ID (delegates to AgentManager).
   * @param id Agent ID
   * @param deleteAfterStop If true, fully delete agent from memory and persistent storage
   */
  async stopAgent(id: string, deleteAfterStop: boolean = false): Promise<void> {
    addLogWithTimestamp({ agentId: 'orchestrator', level: 'info', message: `Attempting to stop${deleteAfterStop ? ' and delete' : ''} agent ${id}.` });
    try {
      if (deleteAfterStop) {
        await this.agentManager.deleteAgent(id);
        addLogWithTimestamp({ agentId: 'orchestrator', level: 'info', message: `Delete command issued for agent ${id}.` });
      } else {
        await this.agentManager.stopAgent(id);
        addLogWithTimestamp({ agentId: 'orchestrator', level: 'info', message: `Stop command issued for agent ${id}.` });
      }
      // Remove from capability registry upon stopping or deleting
      delete this.capabilityRegistry[id];
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      addLogWithTimestamp({ agentId: 'orchestrator', level: 'error', message: `Error stopping/deleting agent ${id}: ${errorMsg}` });
      throw err; // Re-throw to signal failure
    }
  }

  /**
   * Restart a crashed agent with retry logic.
   */
  async restartAgent(agentId: string, agentInfo?: AgentInfo): Promise<'recovered' | 'recovery_failed'> {
     addLogWithTimestamp({ agentId: 'orchestrator', level: 'info', message: `Restart process initiated for agent ${agentId}.` });

    const currentAgentInfo = agentInfo ?? await this.agentManager.getAgentById(agentId);

    if (!currentAgentInfo) {
        addLogWithTimestamp({ agentId: 'orchestrator', level: 'error', message: `[Restart] Agent ${agentId} not found.` });
        return 'recovery_failed';
    }

    // Double-check health status via AgentManager right before attempting restart
    const liveHealth = this.agentManager.getAgentHealth(agentId);
    if (liveHealth !== 'error') {
        addLogWithTimestamp({ agentId: 'orchestrator', level: 'warn', message: `[Restart] Agent ${agentId} is no longer in 'error' state (current: ${liveHealth}). Aborting restart.` });
        // Reset recovery attempts if it was already recovering but fixed itself?
        // delete this.recoveryAttempts[agentId];
        return 'recovery_failed'; // Or maybe 'recovered' if health is 'running'? Needs definition.
    }

    // Increment retry attempts
    this.recoveryAttempts[agentId] = (this.recoveryAttempts[agentId] || 0) + 1;
    addLogWithTimestamp({ agentId: 'orchestrator', level: 'info', message: `[Restart] Recovery attempt ${this.recoveryAttempts[agentId]}/${this.options.maxRecoveryAttempts} for agent ${agentId}.` });


    if (this.recoveryAttempts[agentId] > this.options.maxRecoveryAttempts) {
        const failMsg = `Recovery failed for agent ${agentId} after reaching max attempts (${this.options.maxRecoveryAttempts}).`;
        agentLogStore.addLog({ agentId: agentId, level: 'error', message: failMsg });
        agentHealthStore.setHealth(agentId, 'recovery_failed'); // Ensure health store reflects final state
        logAgentHealthToSupabase(agentId, 'recovery_failed', failMsg, 'error', { event: 'restartAgentMaxAttempts' });
        return 'recovery_failed';
    }

    // Set health to 'restarting'
    agentHealthStore.setHealth(agentId, 'restarting');
    logAgentHealthToSupabase(agentId, 'restarting', `Attempting recovery #${this.recoveryAttempts[agentId]}`, 'warn', { event: 'restartAgentAttempt' });

    // Apply cooldown before attempting restart
    addLogWithTimestamp({ agentId: 'orchestrator', level: 'info', message: `[Restart] Applying recovery cooldown (${this.options.recoveryCooldownMs}ms) for agent ${agentId}.` });
    await new Promise(res => setTimeout(res, this.options.recoveryCooldownMs));

    // Attempt to relaunch the agent using its last known configuration
    try {
        addLogWithTimestamp({ agentId: 'orchestrator', level: 'info', message: `[Restart] Relaunching agent ${agentId} using last configuration.` });
        await this.launchAgent({ // launchAgent now uses agentManager.deployAgent internally
            id: currentAgentInfo.id,
            name: currentAgentInfo.name, // Use name from info
            type: currentAgentInfo.type || 'native',
            config: currentAgentInfo.config || {},
        });

        // Re-verify status after launch attempt
        const postLaunchStatus = this.agentManager.getAgentHealth(agentId);
        if (postLaunchStatus === 'running' || postLaunchStatus === 'recovered') { // AgentManager might set to 'recovered' or directly to 'running'
            const successMsg = `Agent ${agentId} recovered successfully on attempt ${this.recoveryAttempts[agentId]}.`;
            agentLogStore.addLog({ agentId: agentId, level: 'info', message: successMsg });
            agentHealthStore.setHealth(agentId, 'recovered'); // Explicitly set health store
            logAgentHealthToSupabase(agentId, 'recovered', successMsg, 'info', { event: 'restartAgentSuccess' });
            delete this.recoveryAttempts[agentId]; // Reset attempts on success
            return 'recovered';
        } else {
             // If launch didn't result in a running/recovered state, consider it a failure for this attempt
             throw new Error(`Agent status was '${postLaunchStatus}' after relaunch attempt.`);
        }

    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const failMsg = `[Restart] Recovery attempt ${this.recoveryAttempts[agentId]} failed for agent ${agentId}: ${errorMsg}`;
        agentLogStore.addLog({ agentId: agentId, level: 'error', message: failMsg, data: { error: err } });

        // Check if max attempts reached *after* this failure
        if (this.recoveryAttempts[agentId] >= this.options.maxRecoveryAttempts) {
            agentHealthStore.setHealth(agentId, 'recovery_failed');
             logAgentHealthToSupabase(agentId, 'recovery_failed', `Recovery failed on final attempt ${this.recoveryAttempts[agentId]}: ${errorMsg}`, 'error', { event: 'restartAgentFinalFailure', error: err });
             agentLogStore.addLog({ agentId: agentId, level: 'error', message: `Agent ${agentId} recovery finally failed after max attempts.` });
        } else {
             // Still marked as crashed, allowing health store/debounce to potentially trigger another attempt
             agentHealthStore.setHealth(agentId, 'crashed');
             logAgentHealthToSupabase(agentId, 'crashed', `Recovery attempt ${this.recoveryAttempts[agentId]} failed: ${errorMsg}`, 'error', { event: 'restartAgentAttemptFailure', error: err });
        }
        return 'recovery_failed'; // Return failure for this attempt
    }
  }

  /**
   * Get an agent by ID.
   */
  async getAgent(agentId: string): Promise<OrchestratedAgent | undefined> {
    const agentInfo = await this.agentManager.findAgentById(agentId); // Use the manager's async getter
    addLogWithTimestamp({ agentId: 'orchestrator', level: 'info', message: `getAgent(${agentId}) lookup result from AgentManager: ${agentInfo ? agentInfo.status : 'not found'}` });
    if (!agentInfo) {
        return undefined;
    }
    // Map to the orchestrator's view
    return agentInfoToOrchestratedAgent(agentInfo);
  }

  /**
   * Get the health status of an agent directly from AgentManager.
   * Returns the status reported by AgentManager which includes heartbeat checks.
   */
  getAgentHealth(agentId: string): ManagerAgentStatus | 'not found' {
    // Delegate directly to agentManager for the most accurate status
    return this.agentManager.getAgentHealth(agentId);
  }

  /**
   * List all agents known by the AgentManager, mapped to the Orchestrator's view.
   */
  async listAgents(): Promise<OrchestratedAgent[]> {
    const agentInfos = await this.agentManager.listAgents(); // Get latest list from manager
    addLogWithTimestamp({ agentId: 'orchestrator', level: 'info', message: `listAgents retrieved ${agentInfos.length} agents from AgentManager.` });
    return agentInfos.map(info => agentInfoToOrchestratedAgent(info)); // Map each to OrchestratedAgent
  }

  /**
   * Get the full swarm state (agents + in-memory messages).
   */
  async getSwarmState(): Promise<SwarmState> {
    const agents = await this.listAgents(); // Get current agents
    return {
      agents: agents,
      messages: [...this.messageBus], // Return a copy of the current message bus
    };
  }

  /**
   * Clears orchestrator-specific state and tells AgentManager to clear its state.
   */
  async reset(): Promise<void> {
     addLogWithTimestamp({ agentId: 'orchestrator', level: 'warn', message: `Resetting orchestrator state and clearing all agents via AgentManager.` });
    // Clear orchestrator state first
    this.messageBus = [];
    this.recoveryAttempts = {};
    this.capabilityRegistry = {};
    // Clear AgentManager state (stops instances, clears map, clears registry)
    await this.agentManager.clearAllAgents();
    addLogWithTimestamp({ agentId: 'orchestrator', level: 'warn', message: `Orchestrator reset complete.` });
  }


  // --- Specific Agent Launchers (Examples) ---

  /**
   * Launch a Quality Control Agent (QC Agent). Does not register with AgentManager by default.
   */
  async launchQCAgent(id: string, openAIApiKey: string): Promise<QCAgent> {
    // Note: This creates a standalone instance, not managed by AgentManager's lifecycle/health checks by default.
    // To manage it, use launchAgent({ type: 'qc', ... }) with appropriate QC Agent factory logic.
    const qcAgent = new QCAgent(id, openAIApiKey);
    agentLogStore.addLog({ agentId: id, level: 'info', message: `Standalone QC Agent launched.` });
    return qcAgent;
  }

  /**
   * Review implementation using a temporary QC Agent.
   */
  async reviewWithQC(ticket: string, implementation: string, openAIApiKey: string): Promise<string> {
    const qcAgentId = `qc-review-${Date.now()}`;
    const qcAgent = await this.launchQCAgent(qcAgentId, openAIApiKey);
    addLogWithTimestamp({ agentId: 'orchestrator', level: 'info', message: `Performing QC review with temporary agent ${qcAgentId}.` });
    const review = await qcAgent.reviewImplementation(ticket, implementation);
    // Consider cleanup/logging for the temporary agent if needed
    return review;
  }

  /**
   * Break down a feature request using a temporary BuilderAgent.
   */
  async buildTickets(request: string): Promise<string[]> {
     // Note: Similar to QC agent, this creates a standalone instance.
    const builderAgentId = `builder-${Date.now()}`;
    const builder = new BuilderAgent(builderAgentId);
    addLogWithTimestamp({ agentId: 'orchestrator', level: 'info', message: `Processing feature request with temporary builder agent ${builderAgentId}.` });
    const tickets = await builder.receiveRequest(request);
    agentLogStore.addLog({ agentId: builder.id, level: 'info', message: `Builder processed request into ${tickets.length} tickets.` });
    return tickets;
  }


  /**
   * Dynamic scaling: auto-spawn/stop agents based on workload (example logic).
   */
  async autoscaleAgents(workload: number): Promise<void> {
     addLogWithTimestamp({ agentId: 'orchestrator', level: 'info', message: `Autoscaling check triggered with workload: ${workload}` });
     const agents = await this.listAgents(); // Gets OrchestratedAgent list
     // Filter based on status suitable for work (e.g., 'healthy', 'recovered')
     const availableAgents = agents.filter(a => a.status === 'healthy' || a.status === 'recovered');
     const targetCount = Math.max(1, Math.ceil(workload / this.options.autoscaleAgentFactor)); // Ensure at least 1 agent

     addLogWithTimestamp({ agentId: 'orchestrator', level: 'info', message: `Autoscaling: Current available agents: ${availableAgents.length}, Target count: ${targetCount}` });


     if (availableAgents.length < targetCount) {
       // Spawn new agents (example type 'general')
       const needed = targetCount - availableAgents.length;
       addLogWithTimestamp({ agentId: 'orchestrator', level: 'info', message: `Autoscaling up: Spawning ${needed} new agent(s).` });
       for (let i = 0; i < needed; i++) {
         const id = `auto-agent-${Date.now()}-${i}`;
         try {
           // Use a default type for auto-scaled agents, adjust as needed
           await this.launchAgent({ id, type: 'general', config: { autoScaled: true } });
         } catch (error) {
             addLogWithTimestamp({ agentId: 'orchestrator', level: 'error', message: `Autoscaling: Failed to launch new agent ${id}: ${error instanceof Error ? error.message : String(error)}` });
         }
       }
     } else if (availableAgents.length > targetCount) {
       // Stop excess agents (simple strategy: stop the newest ones or idle ones)
       const excessCount = availableAgents.length - targetCount;
       // Example: Stop the ones most recently launched based on ID, or use lastActivity if available
       const agentsToStop = availableAgents
                            .sort((a, b) => (b.lastActivity ?? 0) - (a.lastActivity ?? 0)) // Example: Stop least recently active
                           // .sort((a,b) => parseInt(b.id.split('-')[2] || '0') - parseInt(a.id.split('-')[2] || '0')) // Example: Stop newest based on timestamp in ID
                            .slice(0, excessCount);

        addLogWithTimestamp({ agentId: 'orchestrator', level: 'info', message: `Autoscaling down: Stopping ${excessCount} excess agent(s): ${agentsToStop.map(a=>a.id).join(', ')}` });
       for (const agent of agentsToStop) {
         try {
           await this.stopAgent(agent.id);
         } catch (error) {
             addLogWithTimestamp({ agentId: 'orchestrator', level: 'error', message: `Autoscaling: Failed to stop excess agent ${agent.id}: ${error instanceof Error ? error.message : String(error)}` });
         }
       }
     } else {
          addLogWithTimestamp({ agentId: 'orchestrator', level: 'info', message: `Autoscaling: Agent count (${availableAgents.length}) matches target (${targetCount}). No action needed.` });
     }
   }

   /**
    * Updates the config in AgentManager and persists it.
    * Note: This only updates the stored config. Applying it to a running instance might require agent-specific logic (e.g., a `setConfig` method on the agent instance).
    */
   async updateAgentConfig(agentId: string, configUpdate: Partial<AgentInfo['config']>): Promise<boolean> {
     addLogWithTimestamp({ agentId: 'orchestrator', level: 'info', message: `Attempting to update config for agent ${agentId}.` });
     const agentInfo = await this.agentManager.findAgentById(agentId); // Ensure we have the latest info
     if (!agentInfo) {
       addLogWithTimestamp({ agentId: 'orchestrator', level: 'warn', message: `[updateAgentConfig] Agent ${agentId} not found.` });
       return false;
     }

     // Merge new config with existing
     const newConfig = { ...(agentInfo.config ?? {}), ...configUpdate };
     agentInfo.config = newConfig;

     // Update in AgentManager's map (important for subsequent launches/restarts)
     this.agentManager.agents.set(agentId, agentInfo);

     // Attempt to apply config to live instance if possible and method exists
     if (agentInfo.instance && typeof (agentInfo.instance as any).setConfig === 'function') {
        try {
            await (agentInfo.instance as any).setConfig(configUpdate); // Pass only the update part
            agentLogStore.addLog({ agentId: agentId, level: 'info', message: `Live config update applied via setConfig method.` });
        } catch (err) {
             agentLogStore.addLog({ agentId: agentId, level: 'error', message: `Failed to apply live config update via setConfig: ${err instanceof Error ? err.message : String(err)}` });
             // Decide if this should be a fatal error for the update operation
        }
     }

     // Persist the updated AgentInfo (without instance) using AgentManager's helper
     try {
        await this.agentManager.persistAgentInfo(agentId);
        agentLogStore.addLog({ agentId: agentId, level: 'info', message: `Configuration updated and persisted.` });
        return true;
     } catch(err) {
         agentLogStore.addLog({ agentId: agentId, level: 'error', message: `Configuration updated in memory, but failed to persist: ${err instanceof Error ? err.message : String(err)}` });
         return false; // Indicate that persistence failed
     }
   }
}