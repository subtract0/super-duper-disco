import handler from './agent-health';
import { createMocks } from 'node-mocks-http';
import { agentManager } from '../../src/orchestration/agentManagerSingleton';
import { orchestrator } from '../../src/orchestration/orchestratorSingleton';

describe('/api/agent-health API', () => {
  beforeEach(() => {
    // Stop all running agents
    agentManager.listAgents().forEach(agent => agentManager.stopAgent(agent.id));
  });

  it('returns health for all agents (empty)', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(Array.isArray(data.health)).toBe(true);
    expect(data.health.length).toBe(0);
  });

  it('returns health for a running agent', async () => {
    // Deploy a new agent through the shared orchestrator singleton
    const agentConfig = {
      id: 'api-health-1',
      type: 'test-type',
      status: 'pending' as const,
      host: 'localhost',
      config: {},
    };
    await orchestrator.launchAgent(agentConfig);
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    const agentHealth = data.health.find((h: any) => h.id === 'api-health-1');
    expect(agentHealth).toBeDefined();
    expect(agentHealth.status).toBe('healthy');
  });
});
