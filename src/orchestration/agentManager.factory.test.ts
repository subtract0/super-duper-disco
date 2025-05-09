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

import 'openai/shims/node';

/**
 * @jest-environment node
 */

import { agentManager } from './agentManagerSingleton';

describe('AgentManager (modular factory, isolated)', () => {
  
  beforeEach(() => {
    // agentManager = new AgentManager(); // Use the singleton from agentManagerSingleton instead.
  });
  afterEach(async () => {
    const agents = await agentManager.listAgents();
    for (const agent of agents) {
      await agentManager.stopAgent(agent.id);
    }
  });

  it('should instantiate native, langchain, and autogen agents using factory', async () => {
    const ids = ['native-1', 'langchain-1', 'autogen-1'];
    const types = ['native', 'langchain', 'autogen'];
    for (let idx = 0; idx < ids.length; idx++) {
      const id = ids[idx];
      await agentManager.deployAgent(id, id, types[idx], {});
      const arr = await agentManager.listAgents();
      const agent = arr.find((a) => typeof a === 'object' && a !== null && 'id' in a && (a as { id: string }).id === id);
      expect(agent).toBeDefined();
      expect(agent!.type).toBe(types[idx]);
      expect(agent!.status).toBe('running');
      await agentManager.stopAgent(id);
    }
  });
});
