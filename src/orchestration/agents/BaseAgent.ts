import { EventEmitter } from 'events';

export type AgentStatus = 'running' | 'stopped' | 'healthy' | 'error';

export interface Heartbeat {
  ts: number;
  type: 'heartbeat';
}

export interface LogEntry {
  ts: number;
  msg: string;
}

export interface AgentLike extends EventEmitter {
  id: string;
  name: string;
  status: AgentStatus;
  start(): void;
  stop(): void;
  getLogs(): string[];
}

export class BaseAgent extends EventEmitter implements AgentLike {
  id: string;
  name: string;
  status: AgentStatus = 'stopped';
  private beatTimer?: NodeJS.Timeout;
  private _logs: LogEntry[] = [];

  constructor(id: string, name: string) {
    super();
    this.id   = id;
    this.name = name;
  }

  start(): void {
    this.status = 'running';
    this.log('Agent started');
    this.emit('heartbeat', { ts: Date.now(), type: 'heartbeat' } as Heartbeat);
    this.beatTimer = setInterval(() => {
      this.emit('heartbeat', { ts: Date.now(), type: 'heartbeat' });
      this.log('Agent heartbeat');
    }, 5_000);
  }

  stop(): void {
    this.status = 'stopped';
    this.log('Agent stopped');
    if (this.beatTimer) clearInterval(this.beatTimer);
  }

  log(msg: string): void {
    this._logs.push({ ts: Date.now(), msg });
  }

  getLogs(): string[] {
    return this._logs.map(l => `[${new Date(l.ts).toISOString()}] ${l.msg}`);
  }
}
