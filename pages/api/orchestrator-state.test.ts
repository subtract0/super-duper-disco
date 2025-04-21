import handler from './orchestrator-state';
import { createMocks } from 'node-mocks-http';
import { orchestrator } from '../../src/orchestration/orchestratorSingleton';
import { agentManager } from '../../src/orchestration/agentManagerSingleton';

describe('/api/orchestrator-state API', () => {
  beforeEach(() => {
    // Stop all running agents and reset orchestrator
    for (const agent of agentManager.listAgents()) {
      agentManager.stopAgent(agent.id);
    }
    if (typeof orchestrator.reset === 'function') {
      orchestrator.reset();
    }
  });

  it('returns live state, health, and logs for all agents', async () => {
    // Deploy two agents
    await agentManager.deployAgent('orch-state-1', 'Agent 1', 'native', {});
    await agentManager.deployAgent('orch-state-2', 'Agent 2', 'native', {});
    // Simulate activity
    agentManager.agents.get('orch-state-1').status = 'running';
    agentManager.agents.get('orch-state-2').status = 'stopped';
    // Ensure the map is updated
    agentManager.agents.set('orch-state-1', agentManager.agents.get('orch-state-1'));
    agentManager.agents.set('orch-state-2', agentManager.agents.get('orch-state-2'));
    // Call the endpoint
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.state).toBe('live');
    expect(typeof data.health).toBe('object');
    expect(Object.keys(data.health)).toEqual(
      expect.arrayContaining(['orch-state-1', 'orch-state-2'])
    );
    expect(data.health['orch-state-1'].rawStatus).toBe('running');
    expect(data.health['orch-state-2'].rawStatus).toBe('stopped');
    expect(data.health['orch-state-1'].status).toBe('healthy');
    expect(data.health['orch-state-2'].status).toBe('crashed');
    expect(Array.isArray(data.logs)).toBe(true);
  });

  it('reflects agent state changes (running, stopped, crashed)', async () => {
    await agentManager.deployAgent('orch-state-3', 'Agent 3', 'native', {});
    // Initially running
    let agent = agentManager.agents.get('orch-state-3');
    agent.status = 'running';
    agentManager.agents.set('orch-state-3', agent);
    let { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    let data = JSON.parse(res._getData());
    expect(data.health['orch-state-3'].status).toBe('healthy');
    // Stop the agent
    agentManager.stopAgent('orch-state-3');
    agent = agentManager.agents.get('orch-state-3');
    agent.status = 'crashed'; // Simulate crash
    agentManager.agents.set('orch-state-3', agent);
    ({ req, res } = createMocks({ method: 'GET' }));
    await handler(req, res);
    data = JSON.parse(res._getData());
    expect(data.health['orch-state-3'].status).toBe('crashed');
  });

  it('returns live agent-to-agent messages in the messages field', async () => {
    // Deploy two agents
    await agentManager.deployAgent('orch-msg-1', 'Agent 1', 'native', {});
    await agentManager.deployAgent('orch-msg-2', 'Agent 2', 'native', {});
    // Patch agentMessageMemory.save to avoid real persistence
    (orchestrator as any).agentMessageMemory = { save: jest.fn().mockResolvedValue(undefined) };
    // Send a message from one agent to another via orchestrator
    await orchestrator.sendAgentMessage({
      from: 'orch-msg-1',
      to: 'orch-msg-2',
      content: { test: 'a2a' },
      timestamp: Date.now()
    });
    // Call the endpoint
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    const data = JSON.parse(res._getData());
    expect(Array.isArray(data.messages)).toBe(true);
    expect(data.messages.some(m => m.from === 'orch-msg-1' && m.to === 'orch-msg-2' && m.body && m.body.test === 'a2a')).toBe(true);
  });
});
