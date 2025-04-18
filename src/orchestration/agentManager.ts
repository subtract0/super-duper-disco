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

class AgentManager {
  agents: Map<string, AgentInfo> = new Map();

  deployAgent(id: string, name: string, type: string = 'native', config: any = {}) {
    let agent: any;
    if (type === 'langchain') {
      const { LangChainAgent } = require('./langchainAgent');
      agent = new LangChainAgent(id, config.openAIApiKey || process.env.OPENAI_API_KEY);
    } else if (type === 'autogen') {
      const { AutoGenAgent } = require('./autoGenAgent');
      agent = new AutoGenAgent(id);
    } else {
      agent = new BaseAgent(id, name);
    }
    agent.start();
    const now = Date.now();
    this.agents.set(id, {
      id,
      name,
      status: agent.status,
      logs: agent.logs,
      instance: agent,
      type,
      config,
      lastHeartbeat: now,
      lastActivity: now,
      crashCount: 0,
    });
  }

  stopAgent(id: string) {
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
