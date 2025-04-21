import LangChainAgent from '../langchainAgent';


export class QCAgent {
  id: string;
  langchain: LangChainAgent;
  status: string = 'idle';
  lastReview: string | null = null;
  lastResult: string | null = null;

  // Allow injection of a mock LangChainAgent for testing
  constructor(id: string, openAIApiKey: string, langchainAgentOverride?: LangChainAgent) {
    this.id = id;
    // Prevent LangChainAgent instantiation in test environments to avoid persistent/logging side effects
    if (!(process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID)) {
      this.langchain = langchainAgentOverride || new LangChainAgent(id, openAIApiKey);
    } else {
      this.langchain = langchainAgentOverride || undefined;
    }
  }

  /**
   * Review a developer's implementation for quality, correctness, and completeness.
   * @param ticket The ticket description
   * @param implementation The developer's implementation (code, tests, summary)
   */
  async reviewImplementation(ticket: string, implementation: string): Promise<string> {
    const prompt = `You are the Quality Control (QC) Agent. Review the following implementation for the ticket described.\n\nTicket: ${ticket}\n\nImplementation:\n${implementation}\n\nAssess for correctness, completeness, code quality, and adherence to acceptance criteria. Provide a clear pass/fail verdict and actionable feedback.`;
    const result = await this.langchain.chat(prompt);
    this.status = 'reviewed';
    this.lastReview = implementation;
    this.lastResult = result;
    return result;
  }

  getLogs() {
    return this.langchain.getLogs();
  }
}
