import { AgentOrchestrator } from './agentOrchestrator';
import { agentManager } from './agentManagerSingleton';

export const orchestrator = new AgentOrchestrator(agentManager);
