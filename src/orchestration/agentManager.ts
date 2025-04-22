// src/orchestration/agentManager.ts
// Lint cleanup: const correctness, unused variables, WeakMap-only heartbeat listener tracking
// Final sweep: removed all unused variables and legacy property references.

// --- Imports ---
import type { BaseAgent, AgentLike } from './agents/BaseAgent'; // Import BaseAgent for type assertions
import { createAgent } from './agents/factory';
import { agentHealthStore } from './agentHealth';
import { saveAgentInfo, listAgentInfos, deleteAgentInfo } from './agentRegistry'; // Static imports for registry functions

// --- Types ---
export type AgentStatus = 'running' | 'stopped' | 'error' | 'recovered' | 'recovery_failed' | 'pending' | 'deploying' | 'deployed';

export interface AgentInfo {
  id: string;
  name: string;
  status: AgentStatus;
  logs: string[];
  instance?: AgentLike;
  type?: string;
  config?: Record<string, unknown>;
  lastHeartbeat?: number; // timestamp in ms
  lastActivity?: number; // timestamp in ms
  crashCount?: number;
  deploymentStatus?: 'pending' | 'deploying' | 'deployed' | 'failed';
  deploymentUrl?: string | null;
  lastDeploymentError?: string | null;
}

// --- Class Definition ---


export class AgentManager {
  /** Unique identifier for debugging singleton identity. */
  public _singletonId: number = Math.floor(Math.random() * 1e9);

  /** Static accessor for debugging singleton id. */
  static getSingletonId(): number | undefined {
    return (globalThis as unknown as { __CASCADE_AGENT_MANAGER__?: { _singletonId: number } }).__CASCADE_AGENT_MANAGER__?._singletonId;
  }
/**
   * Tracks heartbeat listeners for each BaseAgent instance (not on agent object for type safety).
   * Assumes all agent instances used as keys are compatible with BaseAgent (i.e., have 'on'/'off' methods and stable identity).
   */
  private _heartbeatListeners: WeakMap<BaseAgent, (beat: { ts: number }) => void> = new WeakMap();
  agents: Map<string, AgentInfo> = new Map();

  /**
   * Hydrates the in-memory agent map from persistent storage on startup.
   */
  static async hydrateFromPersistent(): Promise<AgentManager> {
    // Avoid duplicate singleton on hot reload or test
    const globalAny = globalThis as { __CASCADE_AGENT_MANAGER__?: AgentManager };
    if (globalAny.__CASCADE_AGENT_MANAGER__ instanceof AgentManager) return globalAny.__CASCADE_AGENT_MANAGER__;
    const mgr = new AgentManager();
    try {
      const agentInfosFromDb = await listAgentInfos();
      for (const info of agentInfosFromDb) {
        const validStatus = ['running', 'stopped', 'error', 'recovered', 'recovery_failed', 'pending', 'deploying', 'deployed'].includes(info.status)
                            ? info.status
                            : 'stopped';
        mgr.agents.set(info.id, { ...info, status: validStatus, instance: undefined });
      }
      // Using console.info for standard logging level
      // // console.info(`[AgentManager][hydrateFromPersistent] Hydrated agents from DB:`, Array.from(mgr.agents.keys()));
    } catch (err) {
      console.error('[AgentManager] Failed to hydrate from persistent store:', err);
    } finally {
      (globalThis as unknown as { __CASCADE_AGENT_MANAGER__?: AgentManager }).__CASCADE_AGENT_MANAGER__ = mgr;
    }
    // // console.info(`[AgentManager][hydrateFromPersistent] Singleton _singletonId: ${mgr._singletonId}`);
    return mgr;
  }

  /**
   * Deploys and starts a new agent instance, replacing existing if necessary.
   * Persists the new agent state to the registry.
   */
  async deployAgent(id: string, name: string, type: string = 'native', config: Record<string, unknown> = {}): Promise<void> {
    // Using standard console logging methods
    // console.log(`[AgentManager][deployAgent] Starting deployment for agent id=${id}, name=${name}, type=${type}`);

    if (this.agents.has(id)) {
      const existingInfo = this.agents.get(id);
      if (existingInfo?.instance) {
        // console.log(`[AgentManager][deployAgent] Stopping existing instance for agent ${id}...`);
        try {
          await this.stopAgent(id);
        } catch (err) {
          console.error(`[AgentManager][deployAgent] Failed to stop existing instance ${id} during redeploy:`, err);
          // throw err; // Optionally re-throw
        }
      }
    }

    let agentInstance: AgentLike;
    try {
      console.debug(`[AgentManager][deployAgent][${new Date().toISOString()}] Creating agent instance for ${id}...`);
      agentInstance = createAgent(id, name, type, config);
      console.debug(`[AgentManager][deployAgent][${new Date().toISOString()}] Agent instance created for ${id}.`);
    } catch (err) {
      console.error(`[AgentManager][deployAgent] createAgent factory failed for id=${id}, type=${type}:`, err);
      throw err;
    }

    try {
      console.debug(`[AgentManager][deployAgent] Starting agent instance ${id}...`);
      await agentInstance.start();
      console.debug(`[AgentManager][deployAgent] Agent instance ${id} started.`);
    } catch (e) {
      console.error(`[AgentManager][deployAgent] agent.start() failed for id=${id}, type=${type}:`, e);
      throw e;
    }

    const now = Date.now();
    const initialStatus: AgentStatus = 'running';

    const heartbeatListener = (hb: { ts: number }) => {
      const info = this.agents.get(id);
      if (info && info.status !== 'stopped') {
        info.lastHeartbeat = hb.ts;
        info.status = 'running';
        info.lastActivity = hb.ts;
      }
    };

    try {
      if (typeof agentInstance.on === 'function') {
        agentInstance.on('heartbeat', heartbeatListener);
        this._heartbeatListeners.set(agentInstance as BaseAgent, heartbeatListener);
      } else {
        console.warn(`[AgentManager][deployAgent] Agent instance ${id} does not support 'on' method for heartbeat listener.`);
      }
    } catch (e) {
      console.error(`[AgentManager][deployAgent] agent.on('heartbeat') setup failed for id=${id}, type=${type}:`, e);
    }

    (async () => {
      try { await agentHealthStore.setHealth(id, 'healthy'); } catch { /* ignore */ }
    })();

    const newAgentInfo: AgentInfo = {
      id, name, status: initialStatus,
      logs: typeof agentInstance.getLogs === 'function' ? agentInstance.getLogs() : [],
      instance: agentInstance, type, config,
      lastHeartbeat: now, lastActivity: now, crashCount: 0,
      deploymentStatus: 'deployed', deploymentUrl: null, lastDeploymentError: null,
    };

    this.agents.set(id, newAgentInfo);
    console.debug(`[AgentManager][deployAgent][${new Date().toISOString()}] Agent ${id} added/updated in memory map with status '${initialStatus}'. Current keys:`, Array.from(this.agents.keys()));
    console.debug(`[AgentManager][deployAgent] Singleton _singletonId: ${this._singletonId}. Agent map keys:`, Array.from(this.agents.keys()));

    // --- Persist agent info to Registry ---
    try {
      const agentDataToPersist = { ...newAgentInfo, instance: undefined };
      // console.log(`[AgentManager][deployAgent][${new Date().toISOString()}] ===> Attempting to save agent: ${id}, Status: ${agentDataToPersist.status}`);
      await saveAgentInfo(agentDataToPersist);
      // console.log(`[AgentManager][deployAgent][${new Date().toISOString()}] ===> Successfully persisted agent info for id=${id}`);
    } catch (err) {
      console.error(`[AgentManager][deployAgent][${new Date().toISOString()}] CRITICAL: Failed to persist agent ${id} to Supabase:`, err);
    }
    // --- End Persistence ---

    this.syncAgentLogs(id);
    // // console.info(`[AgentManager][deployAgent] Finished deployment for agent id=${id}. Current agents in map:`, Array.from(this.agents.keys()));
    const finalInfo = this.agents.get(id);
    if (finalInfo) {
      // console.log(`[AgentManager][deployAgent][${new Date().toISOString()}] Agent ${id} deployed with final status: ${finalInfo.status}`);
    } else {
      console.error(`[AgentManager][deployAgent][${new Date().toISOString()}] CRITICAL: Agent ${id} disappeared from map immediately after deployment!`);
    }
  } // End of deployAgent

  // --- Deployment Status Helpers ---
  setDeploymentStatus(id: string, status: 'pending' | 'deploying' | 'deployed' | 'failed'): void { const info = this.agents.get(id); if (info) info.deploymentStatus = status; }
  setDeploymentUrl(id: string, url: string | null): void { const info = this.agents.get(id); if (info) info.deploymentUrl = url; }
  setDeploymentError(id: string, error: string | null): void { const info = this.agents.get(id); if (info) info.lastDeploymentError = error; }

  // --- Log Management ---
  syncAgentLogs(id: string): void { const info = this.agents.get(id); if (info?.instance && typeof info.instance.getLogs === 'function') info.logs = info.instance.getLogs(); }
  setAgentLogs(id: string, logs: string[]): void { const info = this.agents.get(id); if (info) info.logs = logs; }

  // --- Stop Agent ---
  async stopAgent(id: string, deleteAfterStop: boolean = false): Promise<void> {
    const info = this.agents.get(id);
    if (!info) {
      console.warn(`[AgentManager] stopAgent: Agent ${id} not found.`);
      return;
    }
    if (info.instance) {
      // console.log(`[AgentManager][stopAgent] Stopping instance for agent ${id}...`);
      const listener = this._heartbeatListeners?.get(info.instance as BaseAgent);
      if (listener && typeof info.instance.off === 'function') {
        try {
          info.instance.off('heartbeat', listener);
        } catch (error) {
          console.error(`Error removing listener:`, error);
        }
        this._heartbeatListeners.delete(info.instance as BaseAgent);
      }
      try {
        if (typeof info.instance.stop === 'function') await info.instance.stop();
        this.syncAgentLogs(id);
        // console.log(`[AgentManager][stopAgent] Instance for agent ${id} stopped.`);
      } catch (error) {
        console.error(`Error stopping instance ${id}:`, error);
        info.status = 'error';
      } finally {
        info.instance = undefined;
      }
    } else {
      // Kein aktives Instance‑Objekt vorhanden
      if (info.status !== 'error') info.status = 'stopped';
    }
    try {
      console.debug(`[AgentManager][stopAgent] Persisting final status '${info.status}' for agent ${id}.`);
      await this.persistAgentInfo(id); // Use helper
    } catch (error) {
      console.error(`Failed to persist final status for ${id}:`, error);
    }
    if (deleteAfterStop) {
      await this.deleteAgent(id);
    }
  }

  /**
   * Permanently deletes an agent from memory and persistent storage.
   */
  async deleteAgent(id: string): Promise<void> {
    const info = this.agents.get(id);
    if (info) {
      // Stop agent if running
      await this.stopAgent(id);
      // Remove from in-memory map
      this.agents.delete(id);
      // Remove from persistent storage
      try {
        await deleteAgentInfo(id);
        // // console.info(`[AgentManager][deleteAgent] Agent ${id} deleted from persistent registry and memory.`);
      } catch (error) {
        console.error(`[AgentManager][deleteAgent] Failed to delete agent ${id} from persistent registry:`, error);
        throw error;
      }
    } else {
      // Agent not found in memory, attempt to delete from persistent storage anyway
      try {
        await deleteAgentInfo(id);
        // // console.info(`[AgentManager][deleteAgent] Agent ${id} deleted from persistent registry (not present in memory).`);
      } catch (error) {
        console.error(`[AgentManager][deleteAgent] Failed to delete agent ${id} from persistent registry:`, error);
        throw error;
      }
    }
  }

  /**
   * List all agents currently known to the AgentManager.
   */
  public async listAgents(): Promise<AgentInfo[]> {
    return Array.from(this.agents.values());
  }

  /**
   * Returns the last heartbeat timestamp for the agent with the given id.
   */
  getAgentLastHeartbeat(id: string): number | null {
    const info = this.agents.get(id);
    return info?.lastHeartbeat ?? null;
  }

  /**
   * Returns the last activity timestamp for the agent with the given id.
   */
  getAgentLastActivity(id: string): number | null {
    const info = this.agents.get(id);
    return info?.lastActivity ?? null;
  }

  /**
   * Returns the logs for the agent with the given id.
   */
  getAgentLogs(id: string): string[] {
    const info = this.agents.get(id);
    if (info?.instance && typeof info.instance.getLogs === 'function') {
      return info.instance.getLogs();
    }
    return info?.logs ?? [];
  }

  /**
   * Returns AgentStatus or 'not found' for the agent with the given id.
   */
  public getAgentHealth(id: string): AgentStatus | 'not found' {
    const info = this.agents.get(id);
    if (!info) {
      return 'not found';
    }
    if (info.status === 'running') {
      const timeout = process.env.AGENT_HEARTBEAT_TIMEOUT_MS ? parseInt(process.env.AGENT_HEARTBEAT_TIMEOUT_MS, 10) : 15000;
      const now = Date.now();
      if (!info.lastHeartbeat || now - (info.lastHeartbeat || 0) > timeout) {
        console.warn(`[AgentManager][getAgentHealth] Agent ${id} missed heartbeat!`);
        info.status = 'error';
        info.crashCount = (info.crashCount || 0) + 1;
        this.agents.set(id, info);
        // Persist error state using the helper
        this.persistAgentInfo(id).catch((error) => console.error(`Failed to persist error status for ${id}:`, error));
        // console.log(`[AgentManager][getAgentHealth] Triggering auto-recovery for agent ${id}.`);
        void this.autoRecoverAgent(id); // Fire and forget recovery
        return 'error';
      }
    }
    return info.status;
  }

  /**
   * Gets agent by ID (memory first, then DB). Returns AgentInfo or undefined.
   */
  async findAgentById(id: string): Promise<AgentInfo | undefined> {
    const info = this.agents.get(id);
    return info;
  }

// ... (rest of the code remains the same)
  /** Attempts auto-recovery for crashed agents. */
  public async autoRecoverAgent(id: string): Promise<void> {
    const currentInfo = this.agents.get(id);
    if (!currentInfo || currentInfo.status !== 'error') return; // Early exit if not in error state
    // console.log(`[AgentManager][autoRecoverAgent] Attempting recovery for agent ${id}.`);
    // Listener des alten Agenten sauber entfernen
    const oldListener = this._heartbeatListeners.get(currentInfo.instance as BaseAgent);
    if (oldListener && typeof currentInfo.instance?.off === 'function') {
      currentInfo.instance.off('heartbeat', oldListener);
      this._heartbeatListeners.delete(currentInfo.instance as BaseAgent);
    }
    if (currentInfo.instance && typeof currentInfo.instance.stop === 'function') {
      try { console.debug(`Stopping defunct instance ${id}...`); await currentInfo.instance.stop(); }
      catch (e) { console.error(`Error stopping defunct instance ${id}:`, e); }
      finally { currentInfo.instance = undefined; }
    }
    try {
      console.debug(`Creating/starting new instance ${id}...`);
      const newAgentInstance = createAgent(currentInfo.id, currentInfo.name, currentInfo.type || 'native', currentInfo.config || {});
      await newAgentInstance.start();
      // console.log(`New instance ${id} started.`);
      const now = Date.now();
      const heartbeatListener = (hb: { ts: number }) => { const latestInfo = this.agents.get(id); if (latestInfo && latestInfo.status !== 'stopped') { latestInfo.lastHeartbeat = hb.ts; latestInfo.status = 'running'; latestInfo.lastActivity = hb.ts; } };
       try { if (typeof newAgentInstance.on === 'function') { newAgentInstance.on('heartbeat', heartbeatListener); this._heartbeatListeners.set(newAgentInstance as BaseAgent, heartbeatListener); } }
      catch(e) { console.error(`Failed attach listener post-recovery ${id}:`, e); }
      currentInfo.instance = newAgentInstance; currentInfo.status = 'recovered'; currentInfo.lastHeartbeat = now; currentInfo.lastActivity = now;
      currentInfo.logs = typeof newAgentInstance.getLogs === 'function' ? newAgentInstance.getLogs() : [];
      this.agents.set(id, currentInfo);
      await this.persistAgentInfo(id); // Use helper
      (async () => { try { await agentHealthStore.setHealth(id, 'recovered'); } catch { /* ignore */ } })();
      // console.log(`Agent ${id} recovered successfully.`);
    } catch (error) {
      console.error(`Recovery attempt failed for ${id}:`, error);
       const latestInfo = this.agents.get(id);
       if (latestInfo && latestInfo.status !== 'recovered' && latestInfo.status !== 'running') {
            latestInfo.status = 'recovery_failed'; latestInfo.instance = undefined; this.agents.set(id, latestInfo);
            this.persistAgentInfo(id).catch(err => console.error(`Failed persist recovery_failed status ${id}:`, err)); // Use helper
       }
    }
  } // End of autoRecoverAgent

  /** Helper to persist agent info (without instance) to registry. */
  private async persistAgentInfo(id: string): Promise<void> {
    const info = this.agents.get(id);
    if (info) {
        try {
            await saveAgentInfo({ ...info, instance: undefined }); // Uses static import
            // More informative debug log
            console.debug(`[AgentManager][persistAgentInfo] Persisted info for agent ${id}. Status: ${info.status}`);
        } catch (e) {
             console.error(`[AgentManager][persistAgentInfo] Failed to persist agent info for ${id}:`, e);
             throw e; // Re-throw error for callers to handle
        }
    } else {
         console.warn(`[AgentManager][persistAgentInfo] Agent ${id} not found in map, cannot persist.`);
    }
  } // End of persistAgentInfo

} // End of AgentManager class