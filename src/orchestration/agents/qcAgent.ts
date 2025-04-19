import LangChainAgent from '../langchainAgent';


export class QCAgent {
  id: string;
  langchain: LangChainAgent;
  status: string = 'idle';
  lastReview: string | null = null;
  lastResult: string | null = null;

  constructor(id: string, openAIApiKey: string) {
    this.id = id;
    this.langchain = new LangChainAgent(id, openAIApiKey);
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
