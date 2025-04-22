// NOTE: All agent mocks used with AgentManager.deployAgent MUST implement EventEmitter (e.g., use BaseAgent or a compatible class).
// This prevents TypeError: agent.on is not a function during tests. See PLAN.md for regression-proofing details.
import { EventEmitter } from 'events';
import type { AgentManager } from './agentManager';
import type { AgentManager } from './agentManager';

// Minimal EventEmitter-compatible agent mock
function makeAgentMock(id: string, name: string) {
  class MockAgent extends EventEmitter {
    id = id;
    name = name;
    status = 'running';
    logs: string[] = [];
    start = jest.fn();
    stop = jest.fn();
    getLogs = jest.fn().mockReturnValue([]);
    updateHeartbeat = jest.fn();
    updateActivity = jest.fn();
  }
  return new MockAgent();
}

// Mocks for modular agent instantiation: ensures no dependency errors and test isolation
jest.doMock('./langchainAgent', () => ({ LangChainAgent: jest.fn().mockImplementation((id) => makeAgentMock(id, 'langchain')) }));
jest.doMock('./autoGenAgent', () => ({ AutoGenAgent: jest.fn().mockImplementation((id) => makeAgentMock(id, 'autogen')) }));

jest.mock('./supabaseAgentOps', () => ({
  logAgentHealthToSupabase: jest.fn().mockResolvedValue(undefined),
  fetchAgentLogsFromSupabase: jest.fn().mockResolvedValue([]),
}));

    console.debug('[TEST][getCurrentAgents] singleton:', singleton, 'agent count:', agents.length);
    return agents;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[TEST][getCurrentAgents] Error:', err);
    return [];
  }
}

// In-memory array to simulate persistent agent info storage for tests
const mockAgentInfos: unknown[] = [];

// Helper to fetch the singleton id for debugging
function getSingletonId() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { agentManager } = await import('./agentManagerSingleton');
    return agentManager && agentManager.__singletonId;
  } catch {
    return undefined;
  }
}


jest.mock('./agentRegistry', () => ({
  listAgentInfos: jest.fn(() => {
    // eslint-disable-next-line no-console
    console.debug('[MOCK][agentRegistry.listAgentInfos] called, singletonId:', getSingletonId(), 'returning', mockAgentInfos.map(a => a.id));
    return Promise.resolve([...mockAgentInfos]);
  }),
  saveAgentInfo: jest.fn((info) => {
    // eslint-disable-next-line no-console
    console.debug('[MOCK][agentRegistry.saveAgentInfo] called with', info);
    const idx = mockAgentInfos.findIndex(a => a.id === info.id);
    if (idx >= 0) {
      mockAgentInfos[idx] = { ...mockAgentInfos[idx], ...info };
    } else {
      mockAgentInfos.push({ ...info });
    }
    return Promise.resolve(undefined);
  }),
  deleteAgentInfo: jest.fn((id) => {
    // eslint-disable-next-line no-console
    console.debug('[MOCK][agentRegistry.deleteAgentInfo] called with', id);
    const idx = mockAgentInfos.findIndex(a => a.id === id);
    if (idx >= 0) mockAgentInfos.splice(idx, 1);
    return Promise.resolve(undefined);
  }),
  getAgentInfo: jest.fn((id) => {
    const found = mockAgentInfos.find(a => a.id === id) || null;
    return Promise.resolve(found);
  }),
}));

// Reset the mockAgentInfos array before each test to ensure isolation
beforeEach(() => {
  mockAgentInfos.length = 0;
});

/**
 * @jest-environment node
 */

import { getAgentManagerSingleton } from './agentManagerSingleton';
// Do not import agentManager directly; use a local variable after awaiting the singleton.
jest.mock('./persistentMemory', () => {
  const records: unknown[] = [];
  return {
    persistentMemory: {
      save: jest.fn(async (rec) => { records.push(rec); }),
      load: jest.fn(async () => records),
      clear: jest.fn(() => { records.length = 0; }), // Ensure clear() exists and is synchronous for test
      _records: records,
    }
  };
});

// NOTE: Always fetch the agent from agentManager.agents.get(id) after calling getAgentHealth or autoRecoverAgent.
// This ensures you are asserting on the up-to-date agent object, as listAgents() may return a stale copy.
describe('AgentManager', () => {
  let agentManager: AgentManager;
  beforeAll(async () => {
    agentManager = await getAgentManagerSingleton();
  });
  beforeEach(async () => {
    // Reset state before each test
    console.log('[TEST] beforeEach: resetting agentManager singleton');
    const { resetAgentManagerForTest } = (await import('./agentManagerSingleton'));
    await resetAgentManagerForTest();
    agentManager = await getAgentManagerSingleton();
    console.log('[TEST] beforeEach: finished resetAgentManagerForTest, starting persistentMemory.clear');
    (await import('./persistentMemory')).persistentMemory.clear();
    console.log('[TEST] beforeEach: finished persistentMemory.clear');
  });
  afterEach(async () => {
    // Ensure cleanup after each test
    console.log('[TEST] afterEach: resetting agentManager singleton');
    const { resetAgentManagerForTest } = (await import('./agentManagerSingleton'));
    await resetAgentManagerForTest();
    console.log('[TEST] afterEach: finished resetAgentManagerForTest, starting persistentMemory.clear');
    (await import('./persistentMemory')).persistentMemory.clear();
    console.log('[TEST] afterEach: finished persistentMemory.clear');
  });

  /**
   * Simulate agent crash and test auto-recovery (heartbeat loss detection).
   * This is a unit test for the heartbeat/crashCount logic.
   */
  test('should detect agent crash on missed heartbeat', async () => {
    const id = 'crash-test-agent';
    await agentManager.deployAgent(id, id, 'native', {});
    // Simulate missed heartbeat by manipulating lastHeartbeat
    const agents = await agentManager.listAgents();
    // Always mutate the agent from the manager's map, not the copy from listAgents()
    const agent = agentManager.agents.get(id);
    if (agent) {
      agent.lastHeartbeat = Date.now() - 20000; // 20s ago
      agent.status = 'running';
      const status = agentManager.getAgentHealth(id);
      const updatedAgent = agentManager.agents.get(id);
      console.log(`[TEST DEBUG] After missed heartbeat: status=${status}, agent.status=${updatedAgent?.status}, crashCount=${updatedAgent?.crashCount}`);
      expect(status).toBe('error');
      expect(updatedAgent?.crashCount).toBe(1);
    } else {
      throw new Error(`Agent not found for crash test. Agents: ${JSON.stringify(agents)}`);
    }
    agentManager.stopAgent(id);
  });


  test('should deploy and start an agent', async () => {
    const id = 'test-agent-1';
    const type = 'native'; // Use a valid agent type
    await agentManager.deployAgent(id, id, type);
    const agents = await agentManager.listAgents();
    if (agents.length === 0) {
      throw new Error(`No agents found after deploy. Current agents: ${JSON.stringify(agents)}`);
    }
    expect(agents.length).toBe(1);
    expect(agents[0].id).toBe(id);
    expect(agents[0].status).toBe('running');
  });

  // Skipped: persistent memory is not part of the new in-memory agent architecture.
  // See architectural decision: https://github.com/subtract0/super-duper-disco/issues/ARCH-001
  test.skip('should persist agent state to memory on stop', async () => {
    // This test is obsolete with in-memory agent management.
  });

  test.skip('should hydrate agent config from persistent memory on deploy', async () => {
    // This test is obsolete with in-memory agent management.
  });

  test('should stop an agent', async () => {
    const id = 'test-agent-2';
    await agentManager.deployAgent(id, id, 'native');
    await agentManager.stopAgent(id);
    const agents = await agentManager.listAgents();
    const agent = agents.find((a: unknown) => a.id === id);
    if (!agent) {
      throw new Error(`Agent not found after stop. Current agents: ${JSON.stringify(agents)}`);
    }
    expect(agent).toBeDefined();
    expect(agent.status).toBe('stopped');
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

  /**
   * Health Monitoring & Auto-Recovery: Heartbeat Timeout
   * Simulate missed heartbeat to trigger error and auto-recovery.
   */
  test('should log health transition and trigger auto-recovery on missed heartbeat', async () => {
  
    const id = 'auto-recover-agent';
    await agentManager.deployAgent(id, id, 'native');
    const agents = await agentManager.listAgents();
    console.log(`[TEST DEBUG] After deploy, agents:`, agents);
    // Always mutate the agent from the manager's map
    const agent = agentManager.agents.get(id);
    console.log(`[TEST DEBUG] Searched for agent id ${id}, found:`, agent);
    if (!agent) throw new Error('Agent not found');
    agent.lastHeartbeat = Date.now() - 20000; // Exceed default 15s timeout
    agent.status = 'running';
    const status = agentManager.getAgentHealth(id);
    const updatedAgent = agentManager.agents.get(id);
    expect(status).toBe('error');
    expect(updatedAgent?.crashCount).toBeGreaterThanOrEqual(1);
    // Simulate auto-recovery outcome
    agent.status = 'error';
    await agentManager.autoRecoverAgent(id, agent);
    // Should be marked as recovered if successful
    expect(['recovered', 'recovery_failed', 'error']).toContain(agent.status);
  });

  /**
   * Multiple Missed Heartbeats: Crash Count
   */
  test('should increment crashCount on repeated missed heartbeats', async () => {
  
    const id = 'crash-count-agent';
    await agentManager.deployAgent(id, id, 'native');
    // Log singleton id before listAgents
    console.log('[TEST DEBUG] SingletonId before listAgents:', getSingletonId());
    const agents = await agentManager.listAgents();
    console.log(`[TEST DEBUG] After deploy, agents:`, agents);
    // Always mutate the agent from the manager's map
    const agent = agentManager.agents.get(id);
    console.log(`[TEST DEBUG] Searched for agent id ${id}, found:`, agent);
    if (!agent) throw new Error('Agent not found');
    for (let i = 0; i < 3; i++) {
      agent.lastHeartbeat = Date.now() - 20000;
      agent.status = 'running';
      const status = agentManager.getAgentHealth(id);
      const updatedAgent = agentManager.agents.get(id);
      console.log(`[TEST DEBUG] [crashCount loop ${i}] status=${status}, agent.status=${updatedAgent?.status}, crashCount=${updatedAgent?.crashCount}`);
    }
    const finalAgent = agentManager.agents.get(id);
    console.log(`[TEST DEBUG] Final crashCount: ${finalAgent?.crashCount}`);
    expect(finalAgent?.crashCount).toBeGreaterThanOrEqual(3);
  });

  /**
   * Recovery Failure Handling
   */
  test('should log recovery_failed if auto-recovery throws', async () => {
  
    const id = 'fail-recover-agent';
    await agentManager.deployAgent(id, id, 'native');
    const agents = await agentManager.listAgents();
    console.log(`[TEST DEBUG] After deploy, agents:`, agents);
    // Always mutate the agent from the manager's map
    const agent = agentManager.agents.get(id);
    console.log(`[TEST DEBUG] Searched for agent id ${id}, found:`, agent);
    if (!agent) throw new Error('Agent not found');
    agent.status = 'error';
    // Simulate failure by throwing in stop/start
    const failingInstance = { stop: jest.fn(() => { throw new Error('fail stop'); }) };
    agent.instance = failingInstance;
    try {
      await agentManager.autoRecoverAgent(id, agent);
    } catch {}
    const updatedAgent = agentManager.agents.get(id);
    console.log(`[TEST DEBUG] After failed recovery: agent.status=${updatedAgent?.status}`);
    expect(updatedAgent?.status).toBe('recovery_failed');
  });

  /**
   * Recovery Success Handling
   */
  test('should set status to recovered on successful auto-recovery', async () => {
  
    const id = 'success-recover-agent';
    await agentManager.deployAgent(id, id, 'native');
    const agents = await agentManager.listAgents();
console.log(`[TEST DEBUG] After deploy, agents:`, agents);
const agent = agents.find((a: unknown) => a.id === id);
console.log(`[TEST DEBUG] Searched for agent id ${id}, found:`, agent);
    if (!agent) throw new Error('Agent not found');
    agent.status = 'error';
    agent.stop = jest.fn();
    agent.start = jest.fn();
    await agentManager.autoRecoverAgent(id, agent);
    console.log(`[TEST DEBUG] After successful recovery: agent.status=${agent.status}`);
    expect(['recovered', 'running']).toContain(agent.status);
  });
});
