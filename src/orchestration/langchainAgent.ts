import 'openai/shims/node';
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

  constructor(id: string, openAIApiKey: string, model?: any) {
    super();
    this.id = id;
    this.name = 'langchain';
    this.status = 'stopped';
    // Allow model injection for tests
    if (model) {
      this.model = model;
    } else {
      this.model = new ChatOpenAI({
        openAIApiKey,
        temperature: 0.7,
        streaming: false,
      });
    }
  }

  start(): void {
    this.status = 'running';
    this.log('LangChain agent started');
    this.emit('heartbeat', { ts: Date.now(), type: 'heartbeat' });
    // Prevent heartbeat timer in test environments (avoids Jest timeouts)
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) return;
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

  async logLearning(content: string, tags?: string[]): Promise<void> {
    // In test environments, skip persistent logging to avoid teardown errors
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) return;
    await persistentMemory.save({
      type: 'learning',
      content,
      tags: tags || ['agent', 'learning', this.id],
      created_at: new Date().toISOString(),
    });
  }

  async logError(error: string, tags?: string[]): Promise<void> {
    // In test environments, skip persistent logging to avoid teardown errors
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) return;
    await persistentMemory.save({
      type: 'error',
      content: error,
      tags: tags || ['agent', 'error', this.id],
      created_at: new Date().toISOString(),
    });
  }

  async log(msg: string): Promise<void> {
    this._logs.push(`[${new Date().toISOString()}] ${msg}`);
    await this.logLearning(msg);
  }

  getLogs(): string[] {
    return this._logs.slice(-20);
  }
}

export default LangChainAgent;
