import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export class LangChainAgent {
  id: string;
  status: 'stopped' | 'running';
  model: ChatOpenAI;
  logs: string[];

  constructor(id: string, openAIApiKey: string) {
    this.id = id;
    this.status = 'stopped';
    this.logs = [];
    this.model = new ChatOpenAI({
      openAIApiKey,
      temperature: 0.7,
      streaming: false,
    });
  }

  async start() {
    this.status = 'running';
    this.logs.push(`[${new Date().toISOString()}] LangChain agent started`);
  }

  async stop() {
    this.status = 'stopped';
    this.logs.push(`[${new Date().toISOString()}] LangChain agent stopped`);
  }

  async chat(input: string): Promise<string> {
    if (this.status !== 'running') throw new Error('Agent not running');
    const response = await this.model.call([
      new SystemMessage("You are a helpful assistant."),
      new HumanMessage(input),
    ]);
    let text: string;
    if (typeof response.content === 'string') {
      text = response.content;
    } else if (Array.isArray(response.content)) {
      text = response.content.map((c: any) => c.text || '').join(' ');
    } else if (typeof response.content === 'object' && response.content !== null && 'text' in response.content) {
      text = (response.content as any).text;
    } else {
      text = JSON.stringify(response.content);
    }
    this.logs.push(`[${new Date().toISOString()}] User: ${input}`);
    this.logs.push(`[${new Date().toISOString()}] Agent: ${text}`);
    return text;
  }

  getLogs() {
    return this.logs.slice(-20);
  }
}
