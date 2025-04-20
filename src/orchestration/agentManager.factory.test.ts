// NOTE: All agent mocks used with AgentManager.deployAgent MUST implement EventEmitter (e.g., use BaseAgent or a compatible class).
// This prevents TypeError: agent.on is not a function during tests. See PLAN.md for regression-proofing details.
// Dedicated test for modular agent instantiation with mocks, to ensure isolation and reliability.
// This avoids test pollution in the main agentManager.test.ts suite.

import { EventEmitter } from 'events';

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

jest.mock('./langchainAgent', () => ({ LangChainAgent: jest.fn().mockImplementation((id) => makeAgentMock(id, 'langchain')) }));
jest.mock('./autoGenAgent', () => ({ AutoGenAgent: jest.fn().mockImplementation((id) => makeAgentMock(id, 'autogen')) }));
jest.mock('./supabaseAgentOps', () => ({
  logAgentHealthToSupabase: jest.fn().mockResolvedValue(undefined),
  fetchAgentLogsFromSupabase: jest.fn().mockResolvedValue([]),
}));

/**
 * @jest-environment node
 */

import { agentManager } from './agentManagerSingleton';

describe('AgentManager (modular factory, isolated)', () => {
  
  beforeEach(() => {
    // agentManager = new AgentManager(); // Use the singleton from agentManagerSingleton instead.
  });
  afterEach(() => {
    agentManager.listAgents().forEach((agent) => agentManager.stopAgent(agent.id));
  });

  it('should instantiate native, langchain, and autogen agents using factory', () => {
    const ids = ['native-1', 'langchain-1', 'autogen-1'];
    const types = ['native', 'langchain', 'autogen'];
    ids.forEach((id, idx) => {
      agentManager.deployAgent(id, id, types[idx], {});
      const agent = agentManager.listAgents().find((a: any) => a.id === id);
      expect(agent).toBeDefined();
      expect(agent!.type).toBe(types[idx]);
      expect(agent!.status).toBe('running');
    });
    ids.forEach(id => agentManager.stopAgent(id));
  });
});
