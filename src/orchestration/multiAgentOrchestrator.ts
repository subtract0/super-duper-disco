import { agentManager } from './agentManagerSingleton';
import { buildA2AEnvelope, A2AEnvelope } from '../protocols/a2aAdapter';
import type { AgentMessageRecord } from './agentMessageMemory';
import type { AgentMessageRecord } from './agentMessageMemory';

/**
 * MultiAgentOrchestrator: Manages the lifecycle and workflow of all core agents in the Cascade protocol.
 * Handles agent instantiation, workflow progression, and inter-agent messaging.
 */
type AgentHealth = "pending" | "healthy" | "crashed" | "recovering" | "unknown";

// ⚠️ NOTE: Direct usage of agentManager.agents is only safe if the singleton is guaranteed to be initialized (i.e., after awaiting getAgentManagerSingleton()).
// See PLAN.md [2025-04-21T21:18+02:00] Plateau Summary for details on test harness/module isolation issues.
export class MultiAgentOrchestrator {
  agentIds: string[] = ["planner", "researcher", "developer", "devops"];
  state: string = "idle";
  messageBus: A2AEnvelope[] = [];

  private agentMessageMemory: { save: (msg: AgentMessageRecord) => Promise<void> };
  /**
   * Constructor is now sync and only sets up fields. Call `await init(openAIApiKey)` after construction to deploy/start agents.
   */
  constructor(agentMessageMemory: { save: (msg: AgentMessageRecord) => Promise<void> }) {
    // Dependency injection for testability and protocol compliance
    this.agentMessageMemory = agentMessageMemory;
  }

  /**
   * Deploy and start all agents via AgentManager. Must be awaited after construction.
   */
  async init(openAIApiKey: string) {
    if (!agentManager) throw new Error('agentManager is undefined. Ensure agentManager is imported and initialized.');
    await agentManager.deployAgent("planner", "Planner Agent", "langchain", { openAIApiKey });
    await agentManager.deployAgent("researcher", "Researcher Agent", "langchain", { openAIApiKey });
    await agentManager.deployAgent("developer", "Developer Agent", "langchain", { openAIApiKey });
    await agentManager.deployAgent("devops", "DevOps Agent", "langchain", { openAIApiKey });
    for (const id of this.agentIds) {
      const info = agentManager.agents.get(id);
      if (info && info.instance && typeof info.instance.start === 'function') await info.instance.start();
    }
  }

  private getHealth(agent: string): AgentHealth {
    const info = agentManager.agents.get(agent);
    return info ? info.status as AgentHealth : "unknown";
  }

  private getLogs(agent: string): string[] {
    const info = agentManager.agents.get(agent);
    return info ? info.logs : [];
  }

  private async safeCall(agent: string, fn: () => Promise<string>): Promise<string> {
    try {
      const result = await fn();
      return result;
    } catch (err) {
      // Auto-recovery stub: could trigger agentManager restart logic here
      this.getLogs(agent).push(`[${new Date().toISOString()}] Agent ${agent} error: ${err}`);
      throw err;
    }
  }

  /**
   * Send a message from one agent to another and log the interaction.
   */
  /**
   * Send a message from one agent to another using a strict A2A protocol envelope.
   * Ensures protocol compliance and Model Context Protocol (MCP) persistence.
   */
  async sendMessage(from: string, to: string, message: string): Promise<string> {
  // Build a protocol-compliant A2AEnvelope
  const envelope: A2AEnvelope = buildA2AEnvelope({
    type: 'agent-message',
    from,
    to,
    body: message,
    threadId: `${from}->${to}`,
    // Optionally: signature, timestamp, etc.
  });
  // Add to orchestrator message bus
  this.messageBus.push(envelope);
  // MCP persistence: ensure protocol-compliant save
  try {
    await this.agentMessageMemory.save({
      id: envelope.id,
      type: 'a2a',
      content: typeof message === 'string' ? message : JSON.stringify(message),
      role: 'agent',
      provenance: 'a2a-protocol',
      thread_id: envelope.threadId,
      agent_id: to,
      user_id: from,
      tags: ['a2a', 'protocol', 'agent-message'],
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[MultiAgentOrchestrator][A2A->MCP] Failed to persist A2A message to MCP:', err);
  }

    const info = agentManager.agents.get(to);
    if (!info) throw new Error(`Agent with id '${to}' not found.`);
    info.logs.push(`[A2A] ${JSON.stringify(envelope)}`);
    // Delegate to the correct method on the agent instance
    if (to === "researcher" && info.instance.researchTopic) {
      return await this.safeCall("researcher", () => info.instance.researchTopic(message));
    } else if (to === "developer" && info.instance.implementTicket) {
      return await this.safeCall("developer", () => info.instance.implementTicket(message));
    } else if (to === "devops" && info.instance.commitAndVerify) {
      return await this.safeCall("devops", () => info.instance.commitAndVerify(message));
    } else if (to === "planner") {
      info.logs.push("Received by Planner.");
      return "Received by Planner.";
    }
    return "Unknown agent.";
  }

  /**
   * Starts the Cascade protocol workflow given a user idea.
   */
  async runProtocol(idea: string): Promise<any> {
    this.state = "planning";
    const plannerInfo = agentManager.agents.get("planner");
    if (!plannerInfo) throw new Error("Planner agent not found in AgentManager.");
    const plan = await this.safeCall("planner", () => plannerInfo.instance.receiveIdea(idea));
    // Planner requests research from Researcher
    this.state = "researching";
    const research = await this.sendMessage("planner", "researcher", idea);
    // Optionally, Planner can update plan with research here
    this.state = "ticketing";
    const tickets = await this.safeCall("planner", () => plannerInfo.instance.createTickets());
    // For each ticket, run the development and DevOps loop
    for (const ticket of tickets) {
      this.state = `developing:${ticket}`;
      // Developer may request clarification from Researcher
      if (ticket.toLowerCase().includes("research")) {
        await this.sendMessage("developer", "researcher", `Clarify for ticket: ${ticket}`);
      }
      await this.sendMessage("planner", "developer", ticket);
      this.state = `committing:${ticket}`;
      await this.sendMessage("developer", "devops", ticket);
      // Optionally, track ticket status, handle errors, retries, etc.
    }
    this.state = "done";
    // Gather health and logs from AgentManager
    const health: Record<string, string> = {};
    const logs: string[] = [];
    for (const id of this.agentIds) {
      health[id] = this.getHealth(id);
      logs.push(...this.getLogs(id));
    }
    return {
      plan,
      research,
      tickets,
      health,
      logs,
      status: "complete"
    };
  }
}

