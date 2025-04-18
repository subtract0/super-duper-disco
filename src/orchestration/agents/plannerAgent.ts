import { LangChainAgent } from "../langchainAgent";

/**
 * PlannerAgent: Orchestrates the Cascade protocol, manages the plan/tickets, tracks state, and notifies the user.
 * This agent is intended to be managed by the orchestrator and participate in multi-agent workflows.
 */
export class PlannerAgent {
  id: string;
  langchain: LangChainAgent;
  plan: any = {};
  tickets: any[] = [];
  status: string = "idle";

  constructor(id: string, openAIApiKey: string) {
    this.id = id;
    this.langchain = new LangChainAgent(id, openAIApiKey);
  }

  async receiveIdea(idea: string): Promise<string> {
    // Compose a prompt to start the protocol
    const prompt = `You are the Planner Agent for the Cascade Protocol. Receive the following idea and outline a high-level product plan including tech stack, features, and potential pitfalls.\n\nIdea: ${idea}`;
    const plan = await this.langchain.chat(prompt);
    this.plan = plan;
    this.status = "planned";
    return plan;
  }

  async createTickets(): Promise<string[]> {
    // Compose a prompt to break down the plan into tickets
    const prompt = `Given the following product plan, break it down into actionable development tickets. Each ticket should have an objective, acceptance criteria, and a recommended technical approach.\n\nPlan: ${this.plan}`;
    const tickets = await this.langchain.chat(prompt);
    // For now, just store as a string list
    this.tickets = Array.isArray(tickets) ? tickets : [tickets];
    this.status = "ticketed";
    return this.tickets;
  }

  // Additional methods for tracking ticket status, orchestrating agents, etc. can be added here
}
