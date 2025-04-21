import LangChainAgent from '../langchainAgent';


/**
 * ResearcherAgent: Performs deep research tasks as requested by the Planner or Developer.
 * Uses LangChain tools (web search, document loader, etc.) for information gathering and synthesis.
 */
export class ResearcherAgent {
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

  async researchTopic(topic: string): Promise<string> {
    // Compose a prompt to perform in-depth research
    const prompt = `You are the Researcher Agent. Perform deep research on the following topic and provide a structured, detailed report with sources.\n\nTopic: ${topic}`;
    const report = await this.langchain.chat(prompt);
    this.status = "researched";
    return report;
  }

  // Additional methods for document analysis, competitive analysis, etc. can be added here
}
