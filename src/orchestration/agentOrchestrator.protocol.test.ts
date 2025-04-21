import 'openai/shims/node';
import { AgentOrchestrator } from './agentOrchestrator';
import type { AgentMessageRecord } from './agentMessageMemory';
import { buildA2AEnvelope } from '../protocols/a2aAdapter';

describe('AgentOrchestrator Protocol Compliance', () => {
  let orchestrator: AgentOrchestrator;
  let saveSpy: jest.MockedFunction<(msg: AgentMessageRecord) => Promise<void>>;
  beforeEach(() => {
    saveSpy = jest.fn().mockResolvedValue(undefined);
    orchestrator = new AgentOrchestrator('dummy-key', { save: saveSpy });
  });

  test('sendAgentMessage constructs protocol-compliant A2AEnvelope and persists to MCP', async () => {
    const msg = { from: 'planner', to: 'developer', content: 'Build feature X', threadId: 'planner->developer' };
    await orchestrator.sendAgentMessage(msg);
    // Check message bus for protocol-compliant envelope
    const envelope = orchestrator.messageBus.find(e => e.from === msg.from && e.to === msg.to && e.body === msg.content);
    expect(envelope).toBeDefined();
    expect(envelope).toMatchObject({ type: 'agent-message', from: msg.from, to: msg.to, body: msg.content, threadId: msg.threadId });
    // Check MCP persistence
    expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'a2a',
      content: msg.content,
      role: 'agent',
      provenance: 'a2a-protocol',
      thread_id: msg.threadId,
      agent_id: msg.to,
      user_id: msg.from,
      tags: expect.arrayContaining(['a2a', 'protocol', 'agent-message'])
    }));
  });
});
