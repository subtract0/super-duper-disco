import { AgentMessage } from './types';

/**
 * In‑memory message bus.  Inject a different implementation
 * (e.g. Redis, NATS) in production if needed.
 */
export class MessageBus {
  private messages: AgentMessage[] = [];

  publish(msg: AgentMessage): void {
    this.messages.push(msg);
  }

  byReceiver(id: string): AgentMessage[] {
    return this.messages.filter(m => m.to === id);
  }

  list(): AgentMessage[] {
    return [...this.messages];
  }
}
