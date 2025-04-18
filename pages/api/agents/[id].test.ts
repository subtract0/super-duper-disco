import handler from './[id]';
import { createMocks } from 'node-mocks-http';
import { orchestrator } from '../../../src/orchestration/orchestratorSingleton';

describe('/api/agents/[id] API', () => {
  const agentConfig = {
    id: 'test-delete-1',
    type: 'test-type',
    status: 'pending' as const,
    host: 'localhost',
    config: {},
  };

  beforeEach(async () => {
    // Ensure agent exists
    await orchestrator.launchAgent(agentConfig);
  });

  afterEach(async () => {
    // Cleanup: stop agent if still exists
    if (orchestrator.getAgent(agentConfig.id)) {
      await orchestrator.stopAgent(agentConfig.id);
    }
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
