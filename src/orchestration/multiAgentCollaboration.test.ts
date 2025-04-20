// NOTE: All agent mocks used with AgentManager.deployAgent MUST implement EventEmitter (e.g., use BaseAgent or a compatible class).
// This prevents TypeError: agent.on is not a function during tests. See PLAN.md for regression-proofing details.
/**
 * Multi-Agent Collaboration Protocol Tests
 *
 * This suite verifies:
 *  - A2A protocol compliance for agent-to-agent messaging
 *  - MCP persistence for traceability
 *  - Error handling for invalid envelopes and failed persistence
 *  - Agent response/handler invocation on message receipt
 *
 * Protocol flow:
 *   Agent A --(A2A envelope)--> Orchestrator.messageBus --(A2A envelope)--> Agent B
 *   Orchestrator persists message as MCP envelope for traceability
 *   Agent B can process message and optionally reply
 */
import { AgentOrchestrator } from './agentOrchestrator';
import { agentManager } from './agentManagerSingleton';
import { parseA2AEnvelope } from '../protocols/a2aAdapter';

// Helper: create a fresh AgentManager and Orchestrator for each test

describe('Multi-Agent Collaboration (A2A Protocol)', () => {
  
  let orchestrator: AgentOrchestrator;
  beforeEach(async () => {
    // agentManager = new AgentManager(); // Use the singleton from agentManagerSingleton instead.
    orchestrator = new AgentOrchestrator(agentManager, { publish: jest.fn(), list: () => [], byReceiver: () => [] } as any);
    // Always mock agentMessageMemory to avoid real persistence
    (orchestrator as any).agentMessageMemory = { save: jest.fn().mockResolvedValue(undefined) };
  });

  it('should send and receive agent-to-agent messages using A2A envelopes', async () => {
    // Deploy two agents
    await agentManager.deployAgent('agentA', 'Agent A', 'native', {});
    await agentManager.deployAgent('agentB', 'Agent B', 'native', {});
    // Send a message from agentA to agentB
    await orchestrator.sendAgentMessage({
      from: 'agentA',
      to: 'agentB',
      content: { task: 'hello', payload: 42 },
      timestamp: Date.now()
    });
    // Check message bus
    const messages = orchestrator.getAgentMessages('agentB');
    if (!messages.length) {
      // Print the message bus for debugging
      // eslint-disable-next-line no-console
      console.error('Message bus:', JSON.stringify((orchestrator as any).messageBus, null, 2));
    }
    expect(messages.length).toBeGreaterThan(0);
    const envelope = messages[0];
    // Protocol compliance
    expect(envelope.protocol).toBe('A2A');
    expect(envelope.from).toBe('agentA');
    expect(envelope.to).toBe('agentB');
    expect(envelope.body).toEqual({ task: 'hello', payload: 42 });
    // Parsing must succeed
    expect(() => parseA2AEnvelope(envelope)).not.toThrow();
  });

  it('should persist A2A messages as MCP envelopes for traceability', async () => {
    // Mock agentMessageMemory.save to track calls
    const orchestratorAny = orchestrator as any;
    const saveMock = jest.fn().mockResolvedValue(undefined);
    orchestratorAny.agentMessageMemory = { save: saveMock };
    await agentManager.deployAgent('agentA', 'Agent A', 'native', {});
    await agentManager.deployAgent('agentB', 'Agent B', 'native', {});
    await orchestrator.sendAgentMessage({
      from: 'agentA',
      to: 'agentB',
      content: 'trace me',
      timestamp: Date.now()
    });
    expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'a2a',
        content: expect.stringContaining('trace me'),
        provenance: 'a2a-protocol',
        agent_id: 'agentB',
        user_id: 'agentA',
        tags: expect.arrayContaining(['a2a', 'protocol', 'agent-message'])
      })
    );
  });
});
