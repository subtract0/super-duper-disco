// src/orchestration/agentManager.ts

export type AgentStatus = 'running' | 'stopped' | 'error';

export interface AgentInfo {
  id: string;
  name: string;
  status: AgentStatus;
  logs: string[];
  instance: any; // Can be BaseAgent, LangChainAgent, or AutoGenAgent
  type?: string;
  config?: any;
  lastHeartbeat?: number; // timestamp in ms
  lastActivity?: number; // timestamp in ms
  crashCount?: number;
}

export class BaseAgent {
  id: string;
  name: string;
  status: AgentStatus = 'stopped';
  logs: string[] = [];
  interval: NodeJS.Timeout | null = null;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  start() {
    this.status = 'running';
    this.logs.push(`[${new Date().toISOString()}] Agent started`);
    this.updateHeartbeat();
    this.interval = setInterval(() => {
      this.logs.push(`[${new Date().toISOString()}] Agent heartbeat`);
      this.updateHeartbeat();
    }, 5000);
  }

  updateHeartbeat() {
    (this as any).lastHeartbeat = Date.now();
  }

  updateActivity() {
    (this as any).lastActivity = Date.now();
  }

  stop() {
    this.status = 'stopped';
    this.logs.push(`[${new Date().toISOString()}] Agent stopped`);
    if (this.interval) clearInterval(this.interval);
  }

  getHealth() {
    return this.status;
  }

  getLogs() {
    return this.logs.slice(-20);
  }
}

/**
 * Factory function for modular agent instantiation.
 * Easily extendable for new agent types.
 */
import LangChainAgent from './langchainAgent';
import { persistentMemory } from './persistentMemory';

function createAgent(id: string, name: string, type: string, config: any): BaseAgent {
  switch (type) {
    case 'langchain': {
      return new LangChainAgent(id, config.openAIApiKey || process.env.OPENAI_API_KEY);
    }
    case 'autogen': {
      const { AutoGenAgent } = require('./autoGenAgent');
      return new AutoGenAgent(id);
    }
    default:
      return new BaseAgent(id, name);
  }
}

class AgentManager {
  agents: Map<string, AgentInfo> = new Map();

  /**
   * Deploys and starts a new agent of the given type.
   * Uses createAgent factory for modularity.
   */
  async deployAgent(id: string, name: string, type: string = 'native', config: any = {}) {
    // If an agent with this ID exists, stop and remove it first (for restart/recovery)
    if (this.agents.has(id)) {
      const existing = this.agents.get(id);
      if (existing && existing.instance && typeof existing.instance.stop === 'function') {
        existing.instance.stop();
      }
      this.agents.delete(id);
    }
    // Try to load persistent memory for this agent (by id and type)
    let hydratedConfig = { ...config };
    try {
      const memories = await persistentMemory.query({ type: 'agent_state' });
      const agentMemory = memories.find(m => m.value?.content?.id === id || m.value?.content?.name === name);
      if (agentMemory && agentMemory.value?.content) {
        hydratedConfig = { ...hydratedConfig, ...agentMemory.value.content.config };
      }
    } catch (err) {
      // If persistent memory fails, continue with provided config
    }
    const agent = createAgent(id, name, type, hydratedConfig);
    agent.start();
    const now = Date.now();
    this.agents.set(id, {
      id,
      name,
      status: agent.status,
      logs: agent.logs,
      instance: agent,
      type,
      config: hydratedConfig,
      lastHeartbeat: now,
      lastActivity: now,
      crashCount: 0,
    });
  }

  async stopAgent(id: string) {
    const info = this.agents.get(id);
    if (info && info.instance) {
      info.instance.stop();
      info.status = 'stopped';
      // Set health to 'crashed' to trigger orchestrator auto-recovery
      try {
        const { agentHealthStore } = require('./agentHealth');
        agentHealthStore.setHealth(id, 'crashed');
      } catch (e) {
        // fallback: ignore if not available
      }
      info.lastActivity = Date.now();
      // Save agent state to persistent memory
      try {
        await persistentMemory.save({
          type: 'agent_state',
          content: {
            id: info.id,
            name: info.name,
            type: info.type,
            status: info.status,
            config: info.config,
            logs: info.logs,
            lastHeartbeat: info.lastHeartbeat,
            lastActivity: info.lastActivity,
            crashCount: info.crashCount,
            stoppedAt: Date.now(),
          },
          tags: ['agent', info.type, info.id],
        });
      } catch (err) {
        // If persistent memory fails, continue
      }
    }
  }

  getAgentHealth(id: string) {
    const info = this.agents.get(id);
    if (!info) return 'not found';
    // Crash detection: if lastHeartbeat is too old (e.g. >15s), mark as crashed
    const now = Date.now();
    if (info.lastHeartbeat && now - info.lastHeartbeat > 15000 && info.status === 'running') {
      info.status = 'error';
      info.crashCount = (info.crashCount || 0) + 1;
    }
    return info.status;
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

  // Test helper: set logs for an agent (for integration testing)
  setAgentLogs(id: string, logs: string[]) {
    const info = this.agents.get(id);
    if (info && info.instance) {
      info.instance.logs = logs;
    }
  }

  listAgents() {
    return Array.from(this.agents.values());
  }
  clearAllAgents() {
    for (const info of this.agents.values()) {
      if (info && info.instance && typeof info.instance.stop === 'function') {
        info.instance.stop();
      }
    }
    this.agents.clear();
  }
}

export const agentManager = new AgentManager();
