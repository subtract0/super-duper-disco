import handler from './[id]logs';
import { createMocks } from 'node-mocks-http';
import { orchestrator } from '../../../src/orchestration/orchestratorSingleton';
import { agentManager } from '../../../src/orchestration/agentManager';

describe('/api/agents/agentLogs API', () => {
  const agentConfig = {
    id: 'test-logs-1',
    type: 'test-type',
    status: 'pending' as const,
    host: 'localhost',
    config: {},
  };

  beforeEach(async () => {
    // Ensure agent exists and is running
    await orchestrator.launchAgent(agentConfig);
  });

  afterEach(async () => {
    // Cleanup: stop agent if still exists
    if (orchestrator.getAgent(agentConfig.id)) {
      await orchestrator.stopAgent(agentConfig.id);
    }
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
