import { agentManager } from '../../src/orchestration/agentManagerSingleton';
import { LangChainAgent } from '../../src/orchestration/langchainAgent';
import { AutoGenAgent } from '../../src/orchestration/autoGenAgent';

describe('AgentManager modular support', () => {
  beforeEach(() => {
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
