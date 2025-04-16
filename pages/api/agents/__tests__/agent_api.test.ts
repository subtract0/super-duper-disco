import { createMocks } from 'node-mocks-http';
import agentHandler from '../[id]';
import logsHandler from '../[id]logs';
import healthHandler from '../[id]health';
import { AgentOrchestrator } from '../../../../src/orchestration/agentOrchestrator';
import * as indexModule from '../index';

describe('Agent API Endpoints', () => {
  let orchestrator: AgentOrchestrator;
  beforeEach(async () => {
    orchestrator = new AgentOrchestrator();
    // Patch the singleton used by the API handlers
    (indexModule as any).orchestrator = orchestrator;
    await orchestrator.launchAgent({
      id: 'api-test',
      type: 'test',
      status: 'pending',
      host: 'localhost',
      config: {},
    });

  });

  it('GET /api/agents/[id] returns agent details', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { id: 'api-test' },
    });
    await agentHandler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.agent.id).toBe('api-test');
  });

  it('DELETE /api/agents/[id] stops agent', async () => {
    const { req, res } = createMocks({
      method: 'DELETE',
      query: { id: 'api-test' },
    });
    await agentHandler(req, res);
    expect(res._getStatusCode()).toBe(200);
  });

  it('GET /api/agents/[id]logs returns logs', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { id: 'api-test' },
    });
    await logsHandler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(Array.isArray(data.logs)).toBe(true);
  });

  it('GET /api/agents/[id]health returns health', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { id: 'api-test' },
    });
    await healthHandler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(typeof data.status).toBe('string');
  });
});
