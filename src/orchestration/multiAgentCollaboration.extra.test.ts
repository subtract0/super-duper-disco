/**
 * Additional multi-agent protocol edge case and error handling tests
 */
import { AgentOrchestrator } from './agentOrchestrator';
import { agentManager } from './agentManager';
import { parseA2AEnvelope } from '../protocols/a2aAdapter';

test('should handle invalid A2A envelopes gracefully', async () => {
  const orchestrator = new AgentOrchestrator();
  (orchestrator as any).agentMessageMemory = { save: jest.fn().mockResolvedValue(undefined) };
  // @ts-ignore
  orchestrator.messageBus.push({ notA2A: true, to: 'agentB' });
  expect(() => {
    orchestrator.getAgentMessages('agentB').forEach(msg => parseA2AEnvelope(msg));
  }).toThrow();
});

test('should log and continue if MCP persistence fails', async () => {
  const orchestrator = new AgentOrchestrator();
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
  const orchestrator = new AgentOrchestrator();
  (orchestrator as any).agentMessageMemory = { save: jest.fn().mockResolvedValue(undefined) };
  await agentManager.deployAgent('agentA', 'Agent A', 'native', {});
  await agentManager.deployAgent('agentB', 'Agent B', 'native', {});
  // Simulate Agent B handler
  const handler = jest.fn().mockReturnValue('pong');
  // Patch agentManager to attach handler to agentB
  const info = agentManager.agents.get('agentB');
  info.instance.handleA2A = handler;
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
    if (info.instance.handleA2A) info.instance.handleA2A(env);
  });
  expect(handler).toHaveBeenCalledWith(expect.objectContaining({ body: 'ping' }));
});
