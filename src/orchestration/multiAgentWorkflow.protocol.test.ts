import 'openai/shims/node';
import { MultiAgentWorkflow, AgentConfig } from './multiAgentWorkflow';
import { agentMessageMemory } from './agentMessageMemory';

describe('MultiAgentWorkflow Protocol Compliance', () => {
  let workflow: MultiAgentWorkflow;
  const agentConfigs: AgentConfig[] = [
    { id: 'planner', role: 'Planner', type: 'langchain', openAIApiKey: 'dummy', systemPrompt: 'Plan tasks.' },
    { id: 'developer', role: 'Developer', type: 'langchain', openAIApiKey: 'dummy', systemPrompt: 'Develop features.' }
  ];
  const mockModel = { call: jest.fn().mockResolvedValue('MOCK_RESPONSE') };
  beforeEach(() => {
    workflow = new MultiAgentWorkflow(agentConfigs, undefined, mockModel);
  });

  test('sendMessage constructs protocol-compliant A2AEnvelope and persists to MCP', async () => {
    const saveSpy = jest.spyOn(agentMessageMemory, 'save').mockResolvedValueOnce();
    // Simulate sending a message from planner to developer
    await workflow.sendMessage('planner', 'developer', 'Finish module Z');
    // Find the envelope in the message bus
    const envelope = workflow.messageBus.find(e => e.from === 'planner' && e.to === 'developer' && e.body === 'Finish module Z');
    expect(envelope).toBeDefined();
    expect(envelope).toMatchObject({ type: 'agent-message', from: 'planner', to: 'developer', body: 'Finish module Z', threadId: 'planner->developer' });
    // Check MCP persistence
    expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: 'a2a',
      content: 'Finish module Z',
      role: 'agent',
      provenance: 'a2a-protocol',
      thread_id: 'planner->developer',
      agent_id: 'developer',
      user_id: 'planner',
      tags: expect.arrayContaining(['a2a', 'protocol', 'agent-message'])
    }));
    saveSpy.mockRestore();
  });
});
