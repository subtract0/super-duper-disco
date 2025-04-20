import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

import { EventEmitter } from 'events';
import { AgentLike } from './agents/BaseAgent';

export class LangChainAgent extends EventEmitter implements AgentLike {
  id: string;
  name: string;
  status: 'stopped' | 'running';
  private _logs: string[] = [];
  model: ChatOpenAI;
  beatTimer?: NodeJS.Timeout;

  constructor(id: string, openAIApiKey: string) {
    super();
    this.id = id;
    this.name = 'langchain';
    this.status = 'stopped';
    this.model = new ChatOpenAI({
      openAIApiKey,
      temperature: 0.7,
      streaming: false,
    });
  }

  start(): void {
    this.status = 'running';
    this.log('LangChain agent started');
    this.emit('heartbeat', { ts: Date.now(), type: 'heartbeat' });
    this.beatTimer = setInterval(() => {
      this.emit('heartbeat', { ts: Date.now(), type: 'heartbeat' });
      this.log('LangChain agent heartbeat');
    }, 5000);
  }

  stop(): void {
    this.status = 'stopped';
    this.log('LangChain agent stopped');
    if (this.beatTimer) clearInterval(this.beatTimer);
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
    this.log(`User: ${input}`);
    this.log(`Agent: ${text}`);
    return text;
  }

  log(msg: string): void {
    this._logs.push(`[${new Date().toISOString()}] ${msg}`);
  }

  getLogs(): string[] {
    return this._logs.slice(-20);
  }
}

export default LangChainAgent;
