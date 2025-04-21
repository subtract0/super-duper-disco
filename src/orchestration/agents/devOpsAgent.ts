import LangChainAgent from '../langchainAgent';


/**
 * DevOpsAgent: Handles version control (Git), CI/CD verification, and reports status back to the Planner.
 */
export class DevOpsAgent {
  id: string;
  langchain: LangChainAgent;
  status: string = "idle";

  constructor(id: string, openAIApiKey: string) {
    this.id = id;
    // Prevent LangChainAgent instantiation in test environments to avoid persistent/logging side effects
    if (!(process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID)) {
      this.langchain = new LangChainAgent(id, openAIApiKey);
    }
  }

  async commitAndVerify(ticket: string): Promise<string> {
    // Compose a prompt to commit code and verify CI
    const prompt = `You are the DevOps Agent. For the following ticket, stage the changes, write a descriptive commit message, commit to the repository, and verify CI passes. Report the outcome.\n\nTicket: ${ticket}`;
    const report = await this.langchain.chat(prompt);
    this.status = "committed";
    return report;
  }

  // Additional methods for branch management, CI status checks, etc. can be added here
}
