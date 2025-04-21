import 'openai/shims/node';
import { MultiAgentWorkflow, AgentConfig } from '../../src/orchestration/multiAgentWorkflow';
import type { AgentMessageRecord } from '../../src/orchestration/agentMessageMemory';


describe('MultiAgentWorkflow Protocol Compliance', () => {
  let workflow: MultiAgentWorkflow;
  const agentConfigs: AgentConfig[] = [
    { id: 'planner', role: 'Planner', type: 'langchain', openAIApiKey: 'dummy', systemPrompt: 'Plan tasks.' },
    { id: 'developer', role: 'Developer', type: 'langchain', openAIApiKey: 'dummy', systemPrompt: 'Develop features.' }
  ];
  let saveSpy: jest.MockedFunction<(msg: AgentMessageRecord) => Promise<void>>;
  const mockModel = { call: jest.fn().mockResolvedValue({ content: 'MOCKED_RESPONSE' }) };
  beforeEach(() => {
    saveSpy = jest.fn().mockResolvedValue(undefined);
    // Use the new agentModel injection parameter of MultiAgentWorkflow
    workflow = new MultiAgentWorkflow(agentConfigs, { save: saveSpy }, mockModel);
    // Patch: Set all agent statuses to 'running' for protocol compliance
    Object.values(workflow.agents).forEach(agent => {
      agent.status = 'running';
    });
  });

  test('sendMessage constructs protocol-compliant A2AEnvelope and persists to MCP', async () => {
    // Simulate sending a message from planner to developer
    await workflow.sendMessage('planner', 'developer', 'Finish module Z');
    // Find the envelope in the message bus
    const envelope = workflow.messageBus.find(e => e.from === 'planner' && e.to === 'developer' && e.body === 'Finish module Z');
    expect(envelope).toBeDefined();
    if (!envelope) throw new Error('Envelope not found');
    // Only check protocol-required fields and presence of id, protocol, createdAt
    expect(envelope).toEqual(expect.objectContaining({
      type: 'agent-message',
      from: 'planner',
      to: 'developer',
      body: 'Finish module Z',
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

  test('sendMessage supports mixed agent types (LangChainAgent + AutoGenAgent) and protocol compliance', async () => {
    const mixedConfigs: AgentConfig[] = [
      { id: 'planner', role: 'Planner', type: 'langchain', openAIApiKey: 'dummy', systemPrompt: 'Plan tasks.' },
      { id: 'autogen', role: 'AutoGen', type: 'autogen', systemPrompt: 'AutoGen agent.' }
    ];
    const workflow2 = new MultiAgentWorkflow(mixedConfigs, { save: saveSpy }, mockModel);
    // Set all agent statuses to 'running' for protocol compliance
    Object.values(workflow2.agents).forEach(agent => {
      agent.status = 'running';
    });
    // LangChainAgent -> AutoGenAgent
    await workflow2.sendMessage('planner', 'autogen', 'Hello AutoGen!');
    // AutoGenAgent -> LangChainAgent
    await workflow2.sendMessage('autogen', 'planner', 'Hello Planner!');
    // Check protocol compliance for both directions
    const env1 = workflow2.messageBus.find(e => e.from === 'planner' && e.to === 'autogen');
    const env2 = workflow2.messageBus.find(e => e.from === 'autogen' && e.to === 'planner');
    expect(env1).toBeDefined();
    expect(env2).toBeDefined();
    // Check MCP persistence for both
    expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({
      agent_id: 'autogen',
      user_id: 'planner',
      type: 'a2a',
      provenance: 'a2a-protocol',
      tags: expect.arrayContaining(['a2a', 'protocol', 'agent-message']),
      created_at: expect.any(String),
    }));
    expect(saveSpy).toHaveBeenCalledWith(expect.objectContaining({
      agent_id: 'planner',
      user_id: 'autogen',
      type: 'a2a',
      provenance: 'a2a-protocol',
      tags: expect.arrayContaining(['a2a', 'protocol', 'agent-message']),
      created_at: expect.any(String),
    }));
    // EventEmitter compatibility: all agents should have 'on' method
    Object.values(workflow2.agents).forEach(agent => {
      expect(typeof agent.on).toBe('function');
    });
  });
});
