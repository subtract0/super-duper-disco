// src/orchestration/agentManager.ts

export type AgentStatus = 'running' | 'stopped' | 'error' | 'recovered';

import type { AgentLike } from './agents/BaseAgent';

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
  // Deployment fields
  deploymentStatus?: 'pending' | 'deploying' | 'deployed' | 'failed';
  deploymentUrl?: string | null;
  lastDeploymentError?: string | null;
}

// Use BaseAgent from agents/BaseAgent
// (imported as type above)

/**
 * Factory function for modular agent instantiation.
 * Easily extendable for new agent types.
 */
import { createAgent } from './agents/factory';

export class AgentManager {
  agents: Map<string, AgentInfo> = new Map();

  // Hydrate all agents from persistent storage
  static async hydrateFromPersistent(): Promise<AgentManager> {
    const mgr = new AgentManager();
    try {
      const { listAgentInfos } = await import('./agentRegistry');
      const agentInfos = await listAgentInfos();
      for (const info of agentInfos) {
        // Do NOT hydrate instance; only metadata. Instance is created on demand.
        mgr.agents.set(info.id, { ...info, instance: undefined });
      }
      // Ensure global singleton is always this hydrated instance
      (globalThis as any).__CASCADE_AGENT_MANAGER__ = mgr;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[AgentManager] Failed to hydrate from persistent store:', e);
    }
    return mgr;
  }

  /**
   * Deploys and starts a new agent of the given type.
   * Uses createAgent factory for modularity.
   */
  async deployAgent(id: string, name: string, type: string = 'native', config: Record<string, unknown> = {}) {
    // If an agent with this ID exists, stop and remove it first (for restart/recovery)
    if (this.agents.has(id)) {
      const existing = this.agents.get(id);
      if (existing && existing.instance && typeof existing.instance.stop === 'function') {
        try {
          existing.instance.stop();
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(
            `[AgentManager] existing.instance.stop() failed for id=${id}, type=${type}:`,
            err,
            err instanceof Error ? err.stack : undefined
          );
          throw err;
        }
        // Do NOT delete from map; keep agent for lifecycle tracking
      }
    }
    // No persistent memory hydration in new design
    let agent;
    try {
      agent = createAgent(id, name, type, config);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        `[AgentManager] createAgent failed for id=${id}, type=${type}:`,
        err,
        err instanceof Error ? err.stack : undefined
      );
      throw err;
    }
    try {
      agent.start();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(
        `[AgentManager] agent.start() failed for id=${id}, type=${type}:`,
        e,
        e instanceof Error ? e.stack : undefined
      );
      throw e;
    }
    const now = Date.now();
    // Set status to 'running' after start
    agent.status = 'running';
    // Listen for heartbeat events to update lastHeartbeat
    const heartbeatListener = (hb: { ts: number }) => {
      const info = this.agents.get(id);
      if (info) {
        info.lastHeartbeat = hb.ts;
        info.status = 'running';
      }
    };
    try {
      agent.on('heartbeat', heartbeatListener);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(
        `[AgentManager] agent.on('heartbeat') failed for id=${id}, type=${type}:`,
        e,
        e instanceof Error ? e.stack : undefined
      );
      throw e;
    }
    // Store listener for later removal
    // @ts-expect-error: _heartbeatListener is used for test cleanup
    (agent as BaseAgent)._heartbeatListener = heartbeatListener;
    // Set health to healthy
    (async () => {
      try {
        const mod = await import('./agentHealth');
        mod.agentHealthStore.setHealth(id, 'healthy');
      } catch (e) {
        // ignore if agentHealthStore is not available
      }
    })();
    this.agents.set(id, {
      id,
      name,
      status: 'running',
      logs: typeof agent.getLogs === 'function' ? agent.getLogs() : [],
      instance: agent,
      type,
      config,
      lastHeartbeat: now,
      lastActivity: now,
      crashCount: 0,
      deploymentStatus: 'deployed', // Default to deployed for now (simulate success)
      deploymentUrl: null,
      lastDeploymentError: null,
    });
    // Persist agent info to Supabase
    try {
      const { saveAgentInfo } = await import('./agentRegistry');
      const agent = this.agents.get(id);
      if (agent) {
        await saveAgentInfo({
          ...agent,
          instance: undefined,
        });
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[AgentManager] Failed to persist agent to Supabase:', e);
    }
    // Keep logs in sync with instance
    this.syncAgentLogs(id);
    // Debug log
    console.debug(`[AgentManager][deployAgent] Added agent id=${id}. Current agents:`, Array.from(this.agents.keys()));
    if (!this.agents.has(id)) {
      console.error(`[AgentManager] deployAgent: Agent ${id} not in map after deploy!`);
    } else {
      console.log(`[AgentManager] deployAgent: Agent ${id} deployed with status`, this.agents.get(id)?.status);
    }
  }

  // Deployment status helpers
  setDeploymentStatus(id: string, status: 'pending' | 'deploying' | 'deployed' | 'failed') {
    const info = this.agents.get(id);
    if (info) info.deploymentStatus = status;
  }
  setDeploymentUrl(id: string, url: string | null) {
    const info = this.agents.get(id);
    if (info) info.deploymentUrl = url;
  }
  setDeploymentError(id: string, error: string | null) {
    const info = this.agents.get(id);
    if (info) info.lastDeploymentError = error;
  }

  // Ensure AgentInfo.logs stays in sync with instance.getLogs()
  syncAgentLogs(id: string) {
    const info = this.agents.get(id);
    if (info && info.instance && typeof info.instance.getLogs === 'function') {
      info.logs = info.instance.getLogs();
    }
  }

  setAgentLogs(id: string, logs: string[]) {
    const info = this.agents.get(id);
    if (info && info.instance) {
      // Only update the info.logs field, not instance internals
      info.logs = logs;
      // Ensure logs are synced after setting
      if (typeof this.syncAgentLogs === 'function') {
        this.syncAgentLogs(id);
      }
    }
  }

  async stopAgent(id: string) {
    const info = this.agents.get(id);
    if (info && info.instance) {
      // Remove heartbeat listener to prevent leaks
      if ((info.instance as any)._heartbeatListener) {
        info.instance.off('heartbeat', (info.instance as any)._heartbeatListener);
        delete (info.instance as any)._heartbeatListener;
      }
      info.instance.stop();
      this.syncAgentLogs(id);
      info.status = 'stopped';
      // Persist stopped status to Supabase
      try {
        const { saveAgentInfo } = await import('./agentRegistry');
        await saveAgentInfo({ ...info, instance: undefined });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[AgentManager] Failed to persist stopped agent to Supabase:', e);
      }
    } else {
      console.error(`[AgentManager] stopAgent: Agent ${id} not found in map!`);
    }
  }

  getAgentLastHeartbeat(id: string) {
    const info = this.agents.get(id);
    return info ? info.lastHeartbeat : null;
  }

  getAgentLastActivity(id: string) {
    const info = this.agents.get(id);
    return info ? info.lastActivity : null;
  }

  getAgentLogs(id: string) {
    const info = this.agents.get(id);
    return info ? info.instance?.getLogs() : [];
  }

  /**
   * Returns all agents from persistent storage (Supabase), not just in-memory map.
   * This ensures stateless/serverless/E2E environments always see the latest agent state.
   */
  async listAgents() {
    try {
      const { listAgentInfos } = await import('./agentRegistry');
      const agents = await listAgentInfos();
      console.debug('[AgentManager][listAgents] listAgentInfos returned:', agents.map(a => a.id));
      for (const info of agents) {
        if (!this.agents.has(info.id)) {
          this.agents.set(info.id, { ...info, instance: undefined });
        }
      }
      console.debug('[AgentManager][listAgents] Final agent map:', Array.from(this.agents.keys()));
      return agents;
    } catch (e) {
      console.error('[AgentManager][listAgents] Error:', e);
      return Array.from(this.agents.values());
    }
  }

  // Alias for compatibility with tests and orchestrator code
  async list() {
    return this.listAgents();
  }

  /**
   * Returns an agent by ID. Checks in-memory map first, then persistent storage.
   * Supports stateless/serverless/E2E environments.
   */
  async getAgentById(id: string): Promise<AgentInfo | null> {
    let info = this.agents.get(id);
    if (info) return info;
    try {
      const { getAgentInfo } = await import('./agentRegistry');
      info = await getAgentInfo(id);
      if (info) {
        this.agents.set(id, { ...info, instance: undefined });
        return info;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  async clearAllAgents() {
    for (const info of this.agents.values()) {
      if (info && info.instance && typeof info.instance.stop === 'function') {
        info.instance.stop();
        // Set health to crashed
        (async () => {
          try {
            const mod = await import('./agentHealth');
            mod.agentHealthStore.setHealth(info.id, 'crashed');
          } catch (e) {
            // ignore if agentHealthStore is not available
          }
        })();
      }
    }
    this.agents.clear();
    // Remove all agents from persistent storage
    try {
      const { listAgentInfos, deleteAgentInfo } = await import('./agentRegistry');
      const agents = await listAgentInfos();
      for (const a of agents) {
        await deleteAgentInfo(a.id);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[AgentManager] Failed to clear all agents from Supabase:', e);
    }
  }

  /**
   * Returns the health status of an agent and triggers auto-recovery if unhealthy.
   */
  /**
   * Returns the health status of an agent and triggers auto-recovery if unhealthy.
   * NOTE: Tests and consumers should always retrieve the agent from agentManager.agents.get(id) for up-to-date state.
   */
  public getAgentHealth(id: string) {
    const info = this.agents.get(id);
    if (!info) return 'not found';
    const timeout = typeof process !== 'undefined' && process.env.AGENT_HEARTBEAT_TIMEOUT_MS
      ? parseInt(process.env.AGENT_HEARTBEAT_TIMEOUT_MS, 10)
      : 15000;
    const now = Date.now();
    // If agent is running or already in error, check for missed heartbeat
    if ((info.status === 'running' || info.status === 'error') && info.lastHeartbeat && now - info.lastHeartbeat > timeout) {
      // Always increment crashCount and set status to error on missed heartbeat
      info.crashCount = (info.crashCount || 0) + 1;
      info.status = 'error';
      // Update the agent in the map to ensure reference consistency
      this.agents.set(id, info);
      // Trigger auto-recovery (async, do not await)
      void this.autoRecoverAgent(id, info);
      return 'error';
    }
    return info.status;
  }

  /**
   * Attempts to automatically recover a crashed or unresponsive agent.
   */
  /**
   * Attempts to automatically recover a crashed or unresponsive agent.
   * Sets status to 'recovery_failed' if recovery throws, unless already 'recovered'.
   */
  public async autoRecoverAgent(id: string, info: AgentInfo) {
    if (!info || info.status !== 'error') return;
    // Attempt to stop the existing agent instance before recovery
    if (info.instance && typeof info.instance.stop === 'function') {
      try {
        info.instance.stop();
      } catch (e) {
        // If stopping fails, mark as recovery_failed and return
        info.status = 'recovery_failed';
        this.agents.set(id, info);
        return;
      }
    }
    try {
      const newAgent = createAgent(info.id, info.name, info.type || 'native', info.config || {});
      newAgent.start();
      info.instance = newAgent;
      info.status = 'recovered';
      this.agents.set(id, info); // Ensure agent map is updated
    } catch (e) {
      if (info.status !== 'recovered') {
        info.status = 'recovery_failed';
        this.agents.set(id, info); // Ensure agent map is updated
      }
    }
  }
}
