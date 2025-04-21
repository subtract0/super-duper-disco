import { LangChainAgent } from "./langchainAgent";
import { agentMessageMemory as agentMessageMemorySingleton, AgentMessageRecord } from "./agentMessageMemory";
import { v4 as uuidv4 } from "uuid";
import { buildA2AEnvelope, A2AEnvelope } from '../protocols/a2aAdapter';

/**
 * MultiAgentWorkflow coordinates a team of agents with different roles, tools, and memory
 * to collaboratively solve a complex task. Each agent is powered by LangChain for LLM/tool use.
 */

export interface AgentConfig {
  id: string;
  role: string;
  type: 'langchain' | 'autogen';
  openAIApiKey?: string;
  systemPrompt: string;
  tools?: any[]; // Placeholder for future tool integration
}

import { AutoGenAgent } from './autoGenAgent';
import { AgentLike } from './agents/BaseAgent';

export class MultiAgentWorkflow {
  agents: Record<string, AgentLike> = {};
  roles: Record<string, string> = {};
  memory: Record<string, string[]> = {};
  messageBus: A2AEnvelope[] = [];
  private agentMessageMemory: { save: (msg: AgentMessageRecord) => Promise<void> };

  constructor(agentConfigs: AgentConfig[], agentMessageMemory?: { save: (msg: AgentMessageRecord) => Promise<void> }, agentModel?: any) {
    this.agentMessageMemory = agentMessageMemory || agentMessageMemorySingleton;
    for (const config of agentConfigs) {
      let agent: AgentLike;
      if (config.type === 'langchain') {
        agent = new LangChainAgent(config.id, config.openAIApiKey!, agentModel);
      } else if (config.type === 'autogen') {
        agent = new AutoGenAgent(config.id);
      } else {
        throw new Error(`Unknown agent type: ${config.type}`);
      }
      this.agents[config.id] = agent;
      this.roles[config.id] = config.role;
      this.memory[config.id] = [];
    }
  }

  /**
   * Send a message from one agent to another, with role/context awareness and memory, using A2A protocol envelope.
   */
  /**
   * Send a message from one agent to another using a strict A2A protocol envelope.
   * Ensures protocol compliance and Model Context Protocol (MCP) persistence.
   */
  async sendMessage(fromId: string, toId: string, message: string): Promise<string> {
    const fromRole = this.roles[fromId];
    const toRole = this.roles[toId];
    // Compose history for memory/context
    const history = this.memory[toId].slice(-10).join("\n");
    const prompt = `You are the ${toRole}. ${history ? "Here is your recent conversation:\n" + history : ""}\n${fromRole} says: ${message}`;
    // Build a protocol-compliant A2AEnvelope
    const envelope: A2AEnvelope = buildA2AEnvelope({
      type: 'agent-message',
      from: fromId,
      to: toId,
      body: message,
      threadId: `${fromId}->${toId}`,
      // Optionally: signature, timestamp, etc.
    });
    this.messageBus.push(envelope);
    // Persist as a Model Context Protocol envelope in Supabase for auditability (if agentMessageMemory is available)
    if (this.agentMessageMemory && typeof this.agentMessageMemory.save === 'function') {
      try {
        await this.agentMessageMemory.save({
          id: envelope.id,
          type: 'a2a',
          content: typeof message === 'string' ? message : JSON.stringify(message),
          role: 'agent',
          provenance: 'a2a-protocol',
          thread_id: envelope.threadId,
          agent_id: toId,
          user_id: fromId,
          tags: ['a2a', 'protocol', 'agent-message'],
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        // Optionally log persistence failure
      }
    }
    // Protocol compliance: All agent-to-agent messages must use A2AEnvelope and be MCP-persisted.
    let response: string;
    const agent = this.agents[toId];
    if (typeof (agent as any).chat === 'function') {
      if (agent.status !== 'running') agent.start();
      response = await (agent as any).chat(prompt);
    } else if (typeof (agent as any).receiveMessage === 'function') {
      if (agent.status !== 'running') agent.start();
      response = await (agent as any).receiveMessage(fromId, message);
    } else {
      throw new Error(`Agent ${toId} does not support chat or receiveMessage`);
    }
    // Update memory
    this.memory[toId].push(`From ${fromRole}: ${message}`);
    this.memory[toId].push(`To ${fromRole}: ${response}`);
    return response;
  }

  /**
   * Run a round-robin conversation among all agents, with each agent responding to the previous.
   */
  async collaborativeSolve(task: string, rounds: number = 3): Promise<string[]> {
    const agentIds = Object.keys(this.agents);
    let lastMessage = task;
    let lastAgent = agentIds[0];
    const transcript: string[] = [];
    for (let i = 0; i < rounds; ++i) {
      const nextAgent = agentIds[(i + 1) % agentIds.length];
      const reply = await this.sendMessage(lastAgent, nextAgent, lastMessage);
      transcript.push(`${this.roles[nextAgent]}: ${reply}`);
      lastMessage = reply;
      lastAgent = nextAgent;
    }
    return transcript;
  }
}

/**
 * Example usage:
 *
 * const workflow = new MultiAgentWorkflow([
 *   { id: 'planner', role: 'Planner', openAIApiKey: 'sk-...', systemPrompt: 'You plan tasks.' },
 *   { id: 'researcher', role: 'Researcher', openAIApiKey: 'sk-...', systemPrompt: 'You research.' },
 *   { id: 'coder', role: 'Coder', openAIApiKey: 'sk-...', systemPrompt: 'You write code.' },
 * ]);
 *
 * const result = await workflow.collaborativeSolve('Build a weather app', 6);
 * console.log(result);
 */
