import handler from './agent-logs';
import { createMocks } from 'node-mocks-http';
import { agentLogStore } from '../../src/orchestration/agentLogs';
import { orchestrator } from '../../src/orchestration/orchestratorSingleton';

describe('/api/agent-logs API', () => {
  beforeEach(() => {
    // Clear logs before each test
    if (Array.isArray((agentLogStore as any).logs)) {
      (agentLogStore as any).logs.length = 0;
    }
    // Stop all running agents
    orchestrator.listAgents().forEach(agent => orchestrator.stopAgent(agent.id));
  });

  it('returns empty logs when there are no logs', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(Array.isArray(data.logs)).toBe(true);
    expect(data.logs.length).toBe(0);
  });

  it('returns logs for a running agent', async () => {
    // Launch an agent and log something
    const agentConfig = {
      id: 'api-logs-1',
      type: 'test-type',
      status: 'pending' as const,
      host: 'localhost',
      config: {},
    };
    await orchestrator.launchAgent(agentConfig);
    agentLogStore.addLog({
      agentId: 'api-logs-1',
      timestamp: Date.now(),
      level: 'info',
      message: 'Test log from agent',
    });
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.logs.some((log: any) => log.id === 'api-logs-1' && log.message.includes('Test log'))).toBe(true);
  });
});
