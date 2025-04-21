import 'openai/shims/node';

import { MultiAgentOrchestrator } from './multiAgentOrchestrator';
import type { AgentMessageRecord } from './agentMessageMemory';

describe('MultiAgentOrchestrator Protocol Compliance', () => {
  let orchestrator: MultiAgentOrchestrator;
  let saveSpy: jest.MockedFunction<(msg: AgentMessageRecord) => Promise<void>>;
  beforeEach(() => {
    saveSpy = jest.fn().mockResolvedValue(undefined);
    orchestrator = new MultiAgentOrchestrator('dummy-key', { save: saveSpy });
  });

  test('sendMessage constructs protocol-compliant A2AEnvelope and persists to MCP', async () => {
    // Simulate sending a message from planner to developer
    const response = await orchestrator.sendMessage('planner', 'developer', 'Implement feature Y');
    // Find the envelope in developer's logs
    const logs = orchestrator['getLogs']('developer');
    const a2aLog = logs.find(log => log.includes('A2A'));
    expect(a2aLog).toBeDefined();
    if (!a2aLog) throw new Error('A2A log not found');
    const envelope = JSON.parse(a2aLog.replace(/^\[A2A\] /, ''));
    expect(envelope).toMatchObject({ type: 'agent-message', from: 'planner', to: 'developer', body: 'Implement feature Y', threadId: 'planner->developer' });
    // Check MCP persistence
    expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'a2a',
      content: 'Implement feature Y',
      role: 'agent',
      provenance: 'a2a-protocol',
      thread_id: 'planner->developer',
      agent_id: 'developer',
      user_id: 'planner',
      tags: expect.arrayContaining(['a2a', 'protocol', 'agent-message'])
    }));
  });
});
