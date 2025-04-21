import { AgentOrchestrator } from '../../src/orchestration/agentOrchestrator';
import { agentMessageMemory } from '../../src/orchestration/agentMessageMemory';

describe('AgentOrchestrator Protocol Compliance', () => {
  let orchestrator: AgentOrchestrator;
  beforeEach(() => {
    orchestrator = new AgentOrchestrator('dummy-key', agentMessageMemory);
  });

  test('sendAgentMessage constructs protocol-compliant A2AEnvelope and persists to MCP', async () => {
    const msg = { from: 'planner', to: 'developer', content: 'Build feature X', threadId: 'planner->developer' };
    const saveSpy = jest.spyOn(agentMessageMemory, 'save').mockResolvedValueOnce();
    await orchestrator.sendAgentMessage(msg);
    // Check message bus for protocol-compliant envelope
    const envelope = orchestrator.messageBus.find(e => e.from === msg.from && e.to === msg.to && e.body === msg.content);
    expect(envelope).toBeDefined();
    // Only check protocol-required fields and presence of id, protocol, createdAt
    expect(envelope).toEqual(expect.objectContaining({
      type: 'agent-message',
      from: msg.from,
      to: msg.to,
      body: msg.content,
      threadId: msg.threadId,
      protocol: 'A2A',
    }));
    expect(typeof envelope!.id).toBe('string');
    expect(typeof envelope!.createdAt).toBe('number');
    // Check MCP persistence (partial match)
    expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'a2a',
      content: expect.any(String),
      role: 'agent',
      provenance: 'a2a-protocol',
      thread_id: msg.threadId,
      agent_id: msg.to,
      user_id: msg.from,
      tags: expect.arrayContaining(['a2a', 'protocol', 'agent-message']),
      created_at: expect.any(String),
    }));
    // Root cause: protocol-compliant envelopes include additional fields (id, protocol, createdAt) not asserted in original test.
    saveSpy.mockRestore();
  });
});
