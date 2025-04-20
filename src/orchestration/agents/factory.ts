import { BaseAgent, AgentLike } from './BaseAgent';
import { LangChainAgent } from '../langchainAgent';
import { AutoGenAgent } from '../autoGenAgent';

export function createAgent(id: string, name: string, type?: string, config?: any): AgentLike {
  switch (type) {
    case 'langchain':
      return new LangChainAgent(id, config?.openAIApiKey || '');
    case 'autogen':
      return new AutoGenAgent(id);
    default:
      return new BaseAgent(id, name);
  }
}
