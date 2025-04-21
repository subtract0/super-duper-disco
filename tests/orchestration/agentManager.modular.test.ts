import { getAgentManagerSingleton } from '../../src/orchestration/agentManagerSingleton';
let agentManager: any; // Will be hydrated before each test

import { LangChainAgent } from '../../src/orchestration/langchainAgent';
import { AutoGenAgent } from '../../src/orchestration/autoGenAgent';

// ⚠️ TEST HARNESS NOTE: Always hydrate the singleton before use. See PLAN.md [2025-04-21T21:22+02:00] for details on test harness/module isolation bugs.
describe('AgentManager modular support', () => {
  beforeEach(async () => {
    agentManager = await getAgentManagerSingleton();
    if (!agentManager || typeof agentManager.clearAllAgents !== 'function') {
      throw new Error('[TEST ERROR] agentManager singleton not hydrated or missing clearAllAgents. See PLAN.md for guidance.');
    }
    agentManager.clearAllAgents();
  });

  it('deploys a native agent by default', () => {
    agentManager.deployAgent('n1', 'native1', 'native', {});
    const agents = agentManager.listAgents();
    expect(agents.length).toBe(1);
    const info = agents[0];
    expect(info.type).toBe('native');
    expect(info.instance.status).toBe('running');
    expect(info.instance).not.toBeInstanceOf(LangChainAgent);
    expect(info.instance).not.toBeInstanceOf(AutoGenAgent);
  });

  it('deploys a LangChain agent with correct type', () => {
    agentManager.deployAgent('lc1', 'langchain1', 'langchain', { openAIApiKey: 'dummy-key' });
    const agents = agentManager.listAgents();
    expect(agents.length).toBe(1);
    const info = agents[0];
    expect(info.type).toBe('langchain');
    expect(info.instance).toBeInstanceOf(LangChainAgent);
    expect(info.instance.status).toBe('running');
  });

  it('deploys an AutoGen agent with correct type', () => {
    agentManager.deployAgent('ag1', 'autogen1', 'autogen', {});
    const agents = agentManager.listAgents();
    expect(agents.length).toBe(1);
    const info = agents[0];
    expect(info.type).toBe('autogen');
    expect(info.instance).toBeInstanceOf(AutoGenAgent);
    expect(info.instance.status).toBe('running');
  });
});
