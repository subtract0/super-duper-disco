// Initialize Slack log forwarding if enabled
import { setupSlackLogForwarderFromEnv } from './slackLogForwarder';
setupSlackLogForwarderFromEnv();

export * from './agentOrchestrator';
export { AgentManager } from './agentManager';
export * from './agentManagerSingleton';
export * from './agents/BaseAgent';
export * from './agents/factory';
export * from './agents/qcAgent';
export * from './agents/builderAgent';
export * from './langchainAgent';
export * from './autoGenAgent';
export * from './agentMessageMemory';
export * from './agentHealth';
export * from './agentLogs';
export * from './agentHistory';
