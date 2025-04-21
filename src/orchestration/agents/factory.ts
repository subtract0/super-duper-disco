// FACTORY_VERSION: 2025-04-21T21:00+02:00
console.log('[factory][VERSION] 2025-04-21T21:00+02:00', typeof __filename !== 'undefined' ? __filename : '[undefined]');
import { BaseAgent, AgentLike } from './BaseAgent';
import { LangChainAgent } from '../langchainAgent';
import { AutoGenAgent } from '../autoGenAgent';

export function createAgent(id: string, name: string, type?: string, config?: any): AgentLike {
  // Print module filename for debugging test isolation issues
  // eslint-disable-next-line no-console
  console.log('[factory][createAgent] __filename:', typeof __filename !== 'undefined' ? __filename : '[undefined]');
  // Normalize type for robust matching
  type = typeof type === 'string' ? type.trim().toLowerCase() : type;
  // Deep debug log
  // eslint-disable-next-line no-console
  console.log('[factory][createAgent] called with:', { id, name, type, config, typeofType: typeof type });
  // Defensive: log and assert type before switch
  // eslint-disable-next-line no-console
  console.log('[factory][createAgent][before switch] type:', type, 'typeof:', typeof type);
  if (typeof type !== 'string' || !type) {
    // eslint-disable-next-line no-console
    console.error('[factory][createAgent][ERROR] Invalid type before switch:', type, 'typeof:', typeof type);
    throw new Error(`[createAgent] Invalid agent type before switch: '${type}'`);
  }
  try {
    switch (type) {
      case 'langchain':
        // eslint-disable-next-line no-console
        console.log('[factory][createAgent] type=langchain');
        return new LangChainAgent(id, config?.openAIApiKey || '');
      case 'autogen':
        // eslint-disable-next-line no-console
        console.log('[factory][createAgent] type=autogen');
        return new AutoGenAgent(id);
      case 'test-type':
        // eslint-disable-next-line no-console
        console.log('[factory][createAgent] type=test-type');
        return new BaseAgent(id, name);
      case 'test':
        // eslint-disable-next-line no-console
        console.log('[factory][createAgent] type=test');
        return new BaseAgent(id, name);
      case 'telegram':
        // eslint-disable-next-line no-console
        console.log('[factory][createAgent] type=telegram');
        return new BaseAgent(id, name);
      case 'native':
        // eslint-disable-next-line no-console
        console.log('[factory][createAgent] type=native');
        return new BaseAgent(id, name);
      default:
        // eslint-disable-next-line no-console
        console.log('[factory][createAgent] type=UNKNOWN', type);
        // Throw explicit error for unknown agent type
        throw new Error(`[createAgent] Unknown agent type '${type}'. Config: ${JSON.stringify(config)}`);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[factory][createAgent] Failed to instantiate agent:`, err, (typeof err === 'object' && err !== null && 'stack' in err && typeof (err as any).stack === 'string') ? (err as any).stack : undefined);
    throw err;
  }
}
