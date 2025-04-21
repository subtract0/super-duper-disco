import handler from './[id]';
import { createMocks } from 'node-mocks-http';
import { getOrchestratorSingleton, orchestrator as orchestratorSync, resetOrchestratorSingleton } from '../../../src/orchestration/orchestratorSingleton';
import { getAgentManagerSingleton, agentManager as agentManagerSync, resetAgentManagerSingleton } from '../../../src/orchestration/agentManagerSingleton';

describe('/api/agents/[id] API', () => {
  const agentConfig = {
    id: 'test-delete-1',
    type: 'test-type',
    status: 'pending' as const,
    host: 'localhost',
    config: {},
  };

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
    await orchestrator.launchAgent(agentConfig);
    // eslint-disable-next-line no-console
    console.log('[TEST DEBUG] after launchAgent:', orchestrator.listAgents().map(a => a.id));
  });

  afterEach(async () => {
    // Cleanup: stop agent if still exists
    if (orchestrator.getAgent(agentConfig.id)) {
      await orchestrator.stopAgent(agentConfig.id);
    }
    // Reset singletons after test
    resetAgentManagerSingleton();
    resetOrchestratorSingleton();
    await refreshSingletons();
    // eslint-disable-next-line no-console
    console.log('[TEST DEBUG] afterEach: orchestrator reset, agentManager reset');
  });

  it('GET returns agent details', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { id: agentConfig.id } });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.agent).toBeDefined();
    expect(data.agent.id).toBe(agentConfig.id);
  });

  it('DELETE stops the agent and marks it as crashed', async () => {
    const { req, res } = createMocks({ method: 'DELETE', query: { id: agentConfig.id } });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    // Agent should still exist, but with status 'crashed'
    const agent = orchestrator.getAgent(agentConfig.id);
    expect(agent).toBeDefined();
    expect(agent?.status).toBe('crashed');
    // GET after DELETE should return the crashed agent
    const { req: getReq, res: getRes } = createMocks({ method: 'GET', query: { id: agentConfig.id } });
    await handler(getReq, getRes);
    expect(getRes._getStatusCode()).toBe(200);
    const data = JSON.parse(getRes._getData());
    expect(data.agent).toBeDefined();
    expect(data.agent.status).toBe('crashed');
  });

  it('DELETE returns 404 for missing agent', async () => {
    const { req, res } = createMocks({ method: 'DELETE', query: { id: 'not-found' } });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(404);
  });
});
