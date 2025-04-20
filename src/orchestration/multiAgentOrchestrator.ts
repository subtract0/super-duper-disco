import { agentManager } from './agentManagerSingleton';
import { buildA2AEnvelope, A2AEnvelope } from '../protocols/a2aAdapter';

/**
 * MultiAgentOrchestrator: Manages the lifecycle and workflow of all core agents in the Cascade protocol.
 * Handles agent instantiation, workflow progression, and inter-agent messaging.
 */
type AgentHealth = "pending" | "healthy" | "crashed" | "recovering";

export class MultiAgentOrchestrator {
  agentIds: string[] = ["planner", "researcher", "developer", "devops"];
  state: string = "idle";

  constructor(openAIApiKey: string) {
    // Deploy and start all agents via AgentManager
    if (!agentManager) throw new Error('agentManager is undefined. Ensure agentManager is imported and initialized.');
    agentManager.deployAgent("planner", "Planner Agent", "langchain", { openAIApiKey });
    agentManager.deployAgent("researcher", "Researcher Agent", "langchain", { openAIApiKey });
    agentManager.deployAgent("developer", "Developer Agent", "langchain", { openAIApiKey });
    agentManager.deployAgent("devops", "DevOps Agent", "langchain", { openAIApiKey });
    for (const id of this.agentIds) {
      const info = agentManager.agents.get(id);
      if (info && info.instance && typeof info.instance.start === 'function') info.instance.start();
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
  async sendMessage(from: string, to: string, message: string): Promise<string> {
    const info = agentManager.agents.get(to);
    if (!info) throw new Error(`Agent with id '${to}' not found.`);
    // Build and log an A2A envelope for the message
    const envelope: A2AEnvelope = buildA2AEnvelope({
      type: 'agent-message',
      from,
      to,
      body: message,
      // Optionally: threadId, signature, etc.
    });
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

