// NOTE: All agent mocks used with AgentManager.deployAgent MUST implement EventEmitter (e.g., use BaseAgent or a compatible class).
// This prevents TypeError: agent.on is not a function during tests. See PLAN.md for regression-proofing details.
/**
 * Additional multi-agent protocol edge case and error handling tests
 */
import { AgentOrchestrator } from './agentOrchestrator';
import { agentManager } from './agentManagerSingleton';
import { parseA2AEnvelope } from '../protocols/a2aAdapter';


beforeEach(() => {
  // agentManager = new AgentManager(); // Use the singleton from agentManagerSingleton instead.
});

test('should handle invalid A2A envelopes gracefully', async () => {
  const orchestrator = new AgentOrchestrator(agentManager, { publish: jest.fn(), list: () => [], byReceiver: () => [] } as any);
  (orchestrator as any).agentMessageMemory = { save: jest.fn().mockResolvedValue(undefined) };
  // @ts-ignore
  orchestrator.messageBus.push({ notA2A: true, to: 'agentB' });
  expect(() => {
    orchestrator.getAgentMessages('agentB').forEach(msg => parseA2AEnvelope(msg));
  }).toThrow();
});

test('should log and continue if MCP persistence fails', async () => {
  const orchestrator = new AgentOrchestrator(agentManager, { publish: jest.fn(), list: () => [], byReceiver: () => [] } as any);
  const saveMock = jest.fn().mockRejectedValue(new Error('MCP failure'));
  (orchestrator as any).agentMessageMemory = { save: saveMock };
  await agentManager.deployAgent('agentA', 'Agent A', 'native', {});
  await agentManager.deployAgent('agentB', 'Agent B', 'native', {});
  await expect(orchestrator.sendAgentMessage({
    from: 'agentA',
    to: 'agentB',
    content: 'fail persist',
    timestamp: Date.now()
  })).resolves.not.toThrow();
});

test('should allow agent to process and reply to A2A message', async () => {
  const orchestrator = new AgentOrchestrator(agentManager, { publish: jest.fn(), list: () => [], byReceiver: () => [] } as any);
  (orchestrator as any).agentMessageMemory = { save: jest.fn().mockResolvedValue(undefined) };
  await agentManager.deployAgent('agentA', 'Agent A', 'native', {});
  await agentManager.deployAgent('agentB', 'Agent B', 'native', {});
  // Simulate Agent B handler
  const handler = jest.fn().mockReturnValue('pong');
  // Patch agentManager to attach handler to agentB
  const info = agentManager.agents.get('agentB');
  if (info && info.instance) {
    info.instance.handleA2A = handler;
  } else {
    throw new Error('agentB not found or missing instance');
  }
  // Send message
  await orchestrator.sendAgentMessage({
    from: 'agentA',
    to: 'agentB',
    content: 'ping',
    timestamp: Date.now()
  });
  // Simulate agent processing
  const messages = orchestrator.getAgentMessages('agentB');
  messages.forEach(env => {
  if (info && info.instance && info.instance.handleA2A) info.instance.handleA2A(env);
});
  expect(handler).toHaveBeenCalledWith(expect.objectContaining({ body: 'ping' }));
});
