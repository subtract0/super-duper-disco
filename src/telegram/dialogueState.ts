import { Intent } from './types';
type Draft = { intent: Intent; waitingFor: 'agentId' | 'config' };

export class DialogueState {
  private map = new Map<string, Draft>();

  get(id: string) {
    return this.map.get(id);
  }
  set(id: string, d: Draft) {
    this.map.set(id, d);
  }
  clear(id: string) {
    this.map.delete(id);
  }
}

export const globalState = new DialogueState();
