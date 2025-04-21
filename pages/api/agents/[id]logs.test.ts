import handler from './[id]logs';
import { createMocks } from 'node-mocks-http';
import { getOrchestratorSingleton, orchestrator as orchestratorSync, resetOrchestratorSingleton } from '../../../src/orchestration/orchestratorSingleton';
import { getAgentManagerSingleton, agentManager as agentManagerSync, resetAgentManagerSingleton } from '../../../src/orchestration/agentManagerSingleton';

describe('/api/agents/agentLogs API', () => {
  // Helper to always get fresh orchestrator and agentManager after reset
  let orchestrator: typeof orchestratorSync;
  let agentManager: typeof agentManagerSync;
  async function refreshSingletons() {
    agentManager = await getAgentManagerSingleton();
    orchestrator = await getOrchestratorSingleton();
  }
  const agentConfig = {
    id: 'test-logs-1',
    type: 'test-type',
    status: 'pending' as const,
    host: 'localhost',
    config: {},
  };

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

  it('GET returns logs for running agent', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { id: agentConfig.id } });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(Array.isArray(data.logs)).toBe(true);
    expect(data.logs.length).toBeGreaterThan(0);
    // First log entry should indicate agent launch
    expect(data.logs[0].message).toMatch(/Agent launched/);
  });

  it('GET returns logs for stopped agent', async () => {
    await orchestrator.stopAgent(agentConfig.id);
    const { req, res } = createMocks({ method: 'GET', query: { id: agentConfig.id } });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(Array.isArray(data.logs)).toBe(true);
    // Even after stopping, logs should be available
    expect(data.logs.length).toBeGreaterThan(0);
  });

  it('GET returns empty logs for missing agent', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { id: 'not-found' } });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(Array.isArray(data.logs)).toBe(true);
    expect(data.logs.length).toBe(0);
  });
});
