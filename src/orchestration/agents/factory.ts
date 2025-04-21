import { BaseAgent, AgentLike } from './BaseAgent';
import { LangChainAgent } from '../langchainAgent';
import { AutoGenAgent } from '../autoGenAgent';

export function createAgent(id: string, name: string, type?: string, config?: any): AgentLike {
  try {
    switch (type) {
      case 'langchain':
        return new LangChainAgent(id, config?.openAIApiKey || '');
      case 'autogen':
        return new AutoGenAgent(id);
      case 'test-type':
      case 'test':
      case 'telegram':
      case 'native':
        // For test, telegram, and native agents, always return a BaseAgent to satisfy EventEmitter contract
        return new BaseAgent(id, name);
      default:
        // Throw explicit error for unknown agent type
        throw new Error(`[createAgent] Unknown agent type '${type}'. Config: ${JSON.stringify(config)}`);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[factory][createAgent] Failed to instantiate agent:`, err, (typeof err === 'object' && err !== null && 'stack' in err && typeof (err as any).stack === 'string') ? (err as any).stack : undefined);
    throw err;
  }
}
