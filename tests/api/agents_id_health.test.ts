import handler from '../../pages/api/agents/[id]health';
import { createMocks } from 'node-mocks-http';
import { orchestrator } from '../../src/orchestration/orchestratorSingleton';

describe('/api/agents/[id]health', () => {
  beforeAll(() => {
    // Setup: deploy a test agent
    orchestrator.launchAgent({ id: 'test-agent', type: 'test-type', config: {}, status: 'running', host: 'test' });
  });

  it('should return status for a valid agent id', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { id: 'test-agent' },
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('status');
    expect(['healthy', 'running', 'crashed', 'error', 'not found', 'stopped', 'unknown']).toContain(data.status);
  });

  it('should return 400 for missing/invalid id', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { id: 123 },
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(400);
  });
});
