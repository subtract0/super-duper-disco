// Dedicated test for modular agent instantiation with mocks, to ensure isolation and reliability.
// This avoids test pollution in the main agentManager.test.ts suite.

jest.mock('./langchainAgent', () => ({ LangChainAgent: jest.fn().mockImplementation((id) => ({
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
jest.mock('./autoGenAgent', () => ({ AutoGenAgent: jest.fn().mockImplementation((id) => ({
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

describe('AgentManager (modular factory, isolated)', () => {
  afterEach(() => {
    agentManager.listAgents().forEach(agent => agentManager.stopAgent(agent.id));
  });

  it('should instantiate native, langchain, and autogen agents using factory', () => {
    const ids = ['native-1', 'langchain-1', 'autogen-1'];
    const types = ['native', 'langchain', 'autogen'];
    ids.forEach((id, idx) => {
      agentManager.deployAgent(id, id, types[idx], {});
      const agent = agentManager.listAgents().find(a => a.id === id);
      expect(agent).toBeDefined();
      expect(agent!.type).toBe(types[idx]);
      expect(agent!.status).toBe('running');
    });
    ids.forEach(id => agentManager.stopAgent(id));
  });
});
