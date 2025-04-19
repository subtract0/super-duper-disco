import { createMocks } from 'node-mocks-http';
import handler from '../../pages/api/orchestrator-state';
import { orchestrator } from '../../src/orchestration/orchestratorSingleton';

describe('/api/orchestrator-state', () => {
  beforeEach(() => {
    orchestrator.reset();
  });

  it('returns live state with agents and logs', async () => {
    // Launch two agents
    await orchestrator.launchAgent({ id: 'a1', type: 'native', status: 'pending', host: 'test', config: {} });
    await orchestrator.launchAgent({ id: 'a2', type: 'native', status: 'pending', host: 'test', config: {} });
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.state).toBe('live');
    expect(Object.keys(data.health)).toEqual(expect.arrayContaining(['a1', 'a2']));
    expect(data.health.a1.status).toBe('healthy');
    expect(Array.isArray(data.logs)).toBe(true);
  });
});
