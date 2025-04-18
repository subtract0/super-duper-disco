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

import { agentManager } from './agentManager';

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
    agentManager.listAgents().forEach(agent => {
      agentManager.stopAgent(agent.id);
    });
  });

  test('should deploy and start an agent', () => {
    const id = 'test-agent-1';
    const type = 'test-type';
    agentManager.deployAgent(id, type);
    const agents = agentManager.listAgents();
    expect(agents.length).toBe(1);
    expect(agents[0].id).toBe(id);
    expect(agents[0].status).toBe('running');
  });

  test('should stop an agent', () => {
    const id = 'test-agent-2';
    agentManager.deployAgent(id, 'test-type');
    agentManager.stopAgent(id);
    const agent = agentManager.listAgents().find(a => a.id === id);
    expect(agent).toBeDefined();
    expect(agent!.status).toBe('stopped');
  });

  test('should return logs for an agent', () => {
    const id = 'test-agent-3';
    agentManager.deployAgent(id, 'test-type');
    const logs = agentManager.getAgentLogs(id) || [];
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0]).toContain('Agent started');
    agentManager.stopAgent(id);
    const stoppedLogs = agentManager.getAgentLogs(id) || [];
    expect(stoppedLogs.some((log: string) => log.includes('Agent stopped'))).toBe(true);
  });

  test('should update health status correctly', () => {
    const id = 'test-agent-4';
    agentManager.deployAgent(id, 'test-type');
    expect(agentManager.getAgentHealth(id)).toBe('running');
    agentManager.stopAgent(id);
    expect(agentManager.getAgentHealth(id)).toBe('stopped');
  });
});
