import { LangChainAgent } from "./langchainAgent";
import { v4 as uuidv4 } from "uuid";
import { buildA2AEnvelope, A2AEnvelope } from '../protocols/a2aAdapter';

/**
 * MultiAgentWorkflow coordinates a team of agents with different roles, tools, and memory
 * to collaboratively solve a complex task. Each agent is powered by LangChain for LLM/tool use.
 */

export interface AgentConfig {
  id: string;
  role: string;
  openAIApiKey: string;
  systemPrompt: string;
  tools?: any[]; // Placeholder for future tool integration
}

export class MultiAgentWorkflow {
  agents: Record<string, LangChainAgent> = {};
  roles: Record<string, string> = {};
  memory: Record<string, string[]> = {};
  messageBus: A2AEnvelope[] = [];

  constructor(agentConfigs: AgentConfig[]) {
    for (const config of agentConfigs) {
      this.agents[config.id] = new LangChainAgent(config.id, config.openAIApiKey);
      this.roles[config.id] = config.role;
      this.memory[config.id] = [];
    }
  }

  /**
   * Send a message from one agent to another, with role/context awareness and memory, using A2A protocol envelope.
   */
  async sendMessage(fromId: string, toId: string, message: string): Promise<string> {
    const fromRole = this.roles[fromId];
    const toRole = this.roles[toId];
    // Compose history for memory/context
    const history = this.memory[toId].slice(-10).join("\n");
    const prompt = `You are the ${toRole}. ${history ? "Here is your recent conversation:\n" + history : ""}\n${fromRole} says: ${message}`;
    // Build and store an A2A envelope for the message
    const envelope: A2AEnvelope = buildA2AEnvelope({
      type: 'agent-message',
      from: fromId,
      to: toId,
      body: message,
      // Optionally: threadId, signature, etc.
    });
    this.messageBus.push(envelope);
    // Log envelope for traceability (could be replaced with a logger)
    // console.log(`[A2A]`, envelope);
    const response = await this.agents[toId].chat(prompt);
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
