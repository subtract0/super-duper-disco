import 'openai/shims/node';
import { MultiAgentOrchestrator } from '../../src/orchestration/multiAgentOrchestrator';
import { agentMessageMemory } from '../../src/orchestration/agentMessageMemory';

describe('MultiAgentOrchestrator Protocol Compliance', () => {
  let orchestrator: MultiAgentOrchestrator;
  let saveSpy: jest.MockedFunction<(msg: Record<string, unknown>) => Promise<void>>;
  const mockModel = { call: jest.fn().mockResolvedValue({ content: 'MOCKED_RESPONSE' }) };
  beforeEach(() => {
    saveSpy = jest.fn().mockResolvedValue(undefined);
    // Patch: inject mockModel into all LangChain agents via AgentManager after construction
    orchestrator = new MultiAgentOrchestrator('dummy-key', { save: saveSpy });
    const agentManager = require('../../src/orchestration/agentManagerSingleton').agentManager;
    ['planner', 'researcher', 'developer', 'devops'].forEach(id => {
      const info = agentManager.agents.get(id);
      if (info && info.instance && info.instance.model !== undefined) {
        info.instance.model = mockModel;
      }
    });
  });

  test('sendMessage constructs protocol-compliant A2AEnvelope and persists to MCP', async () => {
    // Simulate sending a message from planner to developer
    await orchestrator.sendMessage('planner', 'developer', 'Implement feature Y');
    // Find the envelope in developer's logs
    const logs = orchestrator['getLogs']('developer');
    const a2aLog = logs.find(log => log.includes('A2A'));
    expect(a2aLog).toBeDefined();
    if (!a2aLog) throw new Error('A2A log not found');
    const envelope = JSON.parse(a2aLog.replace(/^\[A2A\] /, ''));
    // Only check protocol-required fields and presence of id, protocol, createdAt
    // Envelope: protocol-compliant fields only (content is not a field in envelope, it's body)
    expect(envelope).toEqual(expect.objectContaining({
      type: 'agent-message',
      from: 'planner',
      to: 'developer',
      body: 'Implement feature Y',
      threadId: 'planner->developer',
      protocol: 'A2A',
    }));
    expect(typeof envelope.id).toBe('string');
    expect(typeof envelope.createdAt).toBe('number');
    // Check MCP persistence (partial match)
    expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'a2a',
      content: expect.any(String),
      role: 'agent',
      provenance: 'a2a-protocol',
      thread_id: 'planner->developer',
      agent_id: 'developer',
      user_id: 'planner',
      tags: expect.arrayContaining(['a2a', 'protocol', 'agent-message']),
      created_at: expect.any(String),
    }));
    saveSpy.mockRestore();
  });
});
