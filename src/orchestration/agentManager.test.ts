// Mocks for modular agent instantiation: ensures no dependency errors and test isolation
jest.doMock('./langchainAgent', () => ({ LangChainAgent: jest.fn().mockImplementation((id) => ({
  id,
  name: 'langchain',
  status: 'running',
  logs: [],
  start: jest.fn(),
  stop: jest.fn(),
  getLogs: jest.fn().mockReturnValue([]),
  updateHeartbeat: jest.fn(),
  updateActivity: jest.fn(),
})) }));
jest.doMock('./autoGenAgent', () => ({ AutoGenAgent: jest.fn().mockImplementation((id) => ({
  id,
  name: 'autogen',
  status: 'running',
  logs: [],
  start: jest.fn(),
  stop: jest.fn(),
  getLogs: jest.fn().mockReturnValue([]),
  updateHeartbeat: jest.fn(),
  updateActivity: jest.fn(),
})) }));

jest.mock('./supabaseAgentOps', () => ({
  logAgentHealthToSupabase: jest.fn().mockResolvedValue(undefined),
  fetchAgentLogsFromSupabase: jest.fn().mockResolvedValue([]),
}));

import { agentManager } from './agentManager';
jest.mock('./persistentMemory', () => {
  const records: any[] = [];
  return {
    persistentMemory: {
      save: jest.fn(async (rec) => { records.push(rec); }),
      query: jest.fn(async ({ type }) => records.filter(r => r.type === type).map(r => ({ value: { content: r.content } }))),
      getAll: jest.fn(async () => records.map(r => ({ value: { content: r.content } }))),
      clear: () => { records.length = 0; },
      _records: records,
    }
  };
});

describe('AgentManager', () => {

  /**
   * Simulate agent crash and test auto-recovery (heartbeat loss detection).
   * This is a unit test for the heartbeat/crashCount logic.
   */
  test('should detect agent crash on missed heartbeat', () => {
    const id = 'crash-test-agent';
    agentManager.deployAgent(id, id, 'native', {});
    // Simulate missed heartbeat by manipulating lastHeartbeat
    const agent = agentManager.listAgents().find(a => a.id === id);
    if (agent) {
      agent.lastHeartbeat = Date.now() - 20000; // 20s ago
      agent.status = 'running';
      const status = agentManager.getAgentHealth(id);
      expect(status).toBe('error');
      expect(agent.crashCount).toBe(1);
    }
    agentManager.stopAgent(id);
  });
  beforeEach(() => {
    // Reset state before each test
    agentManager.clearAllAgents();
    require('./persistentMemory').persistentMemory.clear();
  });
  afterEach(() => {
    // Ensure cleanup after each test
    agentManager.clearAllAgents();
    require('./persistentMemory').persistentMemory.clear();
  });

  test('should deploy and start an agent', async () => {
    const id = 'test-agent-1';
    const type = 'native'; // Use a valid agent type
    await agentManager.deployAgent(id, id, type);
    const agents = agentManager.listAgents();
    if (agents.length === 0) {
      throw new Error(`No agents found after deploy. Current agents: ${JSON.stringify(agents)}`);
    }
    expect(agents.length).toBe(1);
    expect(agents[0].id).toBe(id);
    expect(agents[0].status).toBe('running');
  });

  test('should persist agent state to memory on stop', async () => {
    const id = 'persist-agent-1';
    await agentManager.deployAgent(id, 'persist-type', 'native', { foo: 'bar' });
    await agentManager.stopAgent(id);
    const pm = require('./persistentMemory').persistentMemory;
    const saved = pm._records.find((r: any) => r.content.id === id);
    expect(saved).toBeDefined();
    expect(saved.content.config.foo).toBe('bar');
    expect(saved.type).toBe('agent_state');
  });

  test('should hydrate agent config from persistent memory on deploy', async () => {
    const id = 'persist-agent-2';
    const pm = require('./persistentMemory').persistentMemory;
    pm._records.push({
      type: 'agent_state',
      content: {
        id,
        name: id,
        type: 'native',
        status: 'stopped',
        config: { fromMemory: true },
        logs: ['memory-log'],
        lastHeartbeat: 123,
        lastActivity: 456,
        crashCount: 0,
        stoppedAt: 789,
      },
      tags: ['agent', 'native', id],
    });
    await agentManager.deployAgent(id, id, 'native', { foo: 'bar' });
    const agent = agentManager.listAgents().find(a => a.id === id);
    expect(agent).toBeDefined();
    expect(agent!.config.fromMemory).toBe(true);
    expect(agent!.config.foo).toBe('bar'); // merged config
  });

  test('should stop an agent', async () => {
    const id = 'test-agent-2';
    await agentManager.deployAgent(id, id, 'native');
    await agentManager.stopAgent(id);
    const agent = agentManager.listAgents().find(a => a.id === id);
    if (!agent) {
      throw new Error(`Agent not found after stop. Current agents: ${JSON.stringify(agentManager.listAgents())}`);
    }
    expect(agent).toBeDefined();
    expect(agent!.status).toBe('stopped');
  });

  test('should return logs for an agent', async () => {
    const id = 'test-agent-3';
    await agentManager.deployAgent(id, id, 'native');
    const logs = agentManager.getAgentLogs(id) || [];
    if (logs.length === 0) {
      throw new Error(`No logs found for agent ${id}. All logs: ${JSON.stringify(logs)}`);
    }
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0]).toContain('Agent started');
    await agentManager.stopAgent(id);
    const stoppedLogs = agentManager.getAgentLogs(id) || [];
    expect(stoppedLogs.some((log: string) => log.includes('Agent stopped'))).toBe(true);
  });

  test('should update health status correctly', async () => {
    const id = 'test-agent-4';
    await agentManager.deployAgent(id, id, 'native');
    expect(agentManager.getAgentHealth(id)).toBe('running');
    await agentManager.stopAgent(id);
    expect(agentManager.getAgentHealth(id)).toBe('stopped');
  });
});
