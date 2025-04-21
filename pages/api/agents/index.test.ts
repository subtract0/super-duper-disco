jest.mock('../../../src/orchestration/supabaseAgentOps', () => ({
  logAgentHealthToSupabase: jest.fn().mockResolvedValue(undefined),
  fetchAgentLogsFromSupabase: jest.fn().mockResolvedValue([]),
}));

import handler from './index';
import { getOrchestratorSingleton, orchestrator as orchestratorSync, resetOrchestratorSingleton } from '../../../src/orchestration/orchestratorSingleton';
import { getAgentManagerSingleton, agentManager as agentManagerSync, resetAgentManagerSingleton } from '../../../src/orchestration/agentManagerSingleton';
import { createMocks } from 'node-mocks-http';

describe('/api/agents/index API', () => {
  async function stopAndLogAllAgents() {
    const agents = orchestrator.listAgents();
    for (const agent of agents) {
      if (agent && agent.id) {
        await orchestrator.stopAgent(agent.id);
      }
    }
    const remaining = orchestrator.listAgents();
    if (remaining.length > 0) {
      // eslint-disable-next-line no-console
      console.error('Agents still present after stop:', JSON.stringify(remaining, null, 2));
    }
  }

  // Helper to always get fresh orchestrator and agentManager after reset
  let orchestrator: typeof orchestratorSync;
  let agentManager: typeof agentManagerSync;
  async function refreshSingletons() {
    agentManager = await getAgentManagerSingleton();
    orchestrator = await getOrchestratorSingleton();
  }

  beforeEach(async () => {
    // Reset singletons to ensure test isolation
    resetAgentManagerSingleton();
    resetOrchestratorSingleton();
    await refreshSingletons();
    // eslint-disable-next-line no-console
    console.log('[TEST DEBUG] beforeEach: orchestrator reset, agentManager reset');
    // Extra: ensure agentManager is also reset
    for (const agent of agentManager.listAgents()) {
      await agentManager.stopAgent(agent.id);
    }
    // eslint-disable-next-line no-console
    console.log('BeforeEach: agents =', JSON.stringify(orchestrator.listAgents(), null, 2));
    if (orchestrator.listAgents().length > 0) {
      throw new Error('Agent pollution before test: ' + JSON.stringify(orchestrator.listAgents(), null, 2));
    }
  });

  afterEach(async () => {
    for (const agent of agentManager.listAgents()) {
      await agentManager.stopAgent(agent.id);
    }
    // Reset singletons after test
    resetAgentManagerSingleton();
    resetOrchestratorSingleton();
    await refreshSingletons();
    // eslint-disable-next-line no-console
    console.log('[TEST DEBUG] afterEach: orchestrator reset, agentManager reset');
    // eslint-disable-next-line no-console
    console.log('AfterEach: agents =', JSON.stringify(orchestrator.listAgents(), null, 2));
  });

  it('GET returns empty agent list initially', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    
    const data = JSON.parse(res._getData());
    
    expect(Array.isArray(data.agents)).toBe(true);
    
    expect(data.agents.length).toBe(0);
    
  });
    

    
  it('POST adds a new agent', async () => {
    
    const { req, res } = createMocks({
    
      method: 'POST',
    
      body: { type: 'telegram', host: 'local', config: { foo: 'bar' } },
    
    });
    
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(201);
    
    const data = JSON.parse(res._getData());
    
    expect(data.ok).toBe(true);
    
    expect(data.agent.type).toBe('telegram');
    
    expect(data.agent.host).toBe('local');
    
    expect(data.agent.config.foo).toBe('bar');
    
    // Should now be present in orchestrator
    
    const agents = orchestrator.listAgents();
    
    expect(agents.length).toBe(1);
    
    expect(agents[0].type).toBe('telegram');
    // Log after test
    // eslint-disable-next-line no-console
    console.log('Test end: agents =', JSON.stringify(orchestrator.listAgents(), null, 2));
  });
    

    
  it('GET returns agent after POST', async () => {
    try {
    // Log before test
    // eslint-disable-next-line no-console
    console.log('Test start: agents =', JSON.stringify(orchestrator.listAgents(), null, 2));
    // Add agent
    const { req: postReq, res: postRes } = createMocks({
      method: 'POST',
      body: { type: 'telegram', host: 'local', config: { foo: 'bar' } },
    });
    await handler(postReq, postRes);
    console.log('After POST: orchestrator.listAgents() =', JSON.stringify(orchestrator.listAgents(), null, 2));
    console.log('After POST: agentManager.listAgents() =', JSON.stringify(agentManager.listAgents(), null, 2));
    // Now GET
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    const data = JSON.parse(res._getData());
    console.log('After GET: data.agents =', JSON.stringify(data.agents, null, 2));
    console.log('After GET: orchestrator.listAgents() =', JSON.stringify(orchestrator.listAgents(), null, 2));
    console.log('After GET: agentManager.listAgents() =', JSON.stringify(agentManager.listAgents(), null, 2));
    expect(data.agents.length).toBe(1);
    // Log after test
    // eslint-disable-next-line no-console
    console.log('Test end: agents =', JSON.stringify(orchestrator.listAgents(), null, 2));
    } catch (err) {
      console.error('Test error:', err);
      throw err;
    }
  });
});
