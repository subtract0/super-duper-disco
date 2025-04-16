import { AgentOrchestrator } from '../agentOrchestrator';

describe('AgentOrchestrator', () => {
  let orchestrator: AgentOrchestrator;
  beforeEach(() => {
    orchestrator = new AgentOrchestrator();
  });

  it('should launch an agent and set health to healthy', async () => {
    const agent = await orchestrator.launchAgent({
      id: 'test1',
      type: 'test',
      status: 'pending',
      host: 'localhost',
      config: {},
    });
    expect(agent.id).toBe('test1');
    expect(agent.status).toBe('healthy');
    expect(orchestrator.getHealth('test1')).toBe('healthy');
  });

  it('should stop an agent and set health to crashed', async () => {
    await orchestrator.launchAgent({
      id: 'test2',
      type: 'test',
      status: 'pending',
      host: 'localhost',
      config: {},
    });
    await orchestrator.stopAgent('test2');
    expect(orchestrator.getHealth('test2')).toBe('crashed');
    expect(orchestrator.getAgent('test2')).toBeUndefined();
  });

  it('should log agent launch and stop events', async () => {
    await orchestrator.launchAgent({
      id: 'test3',
      type: 'test',
      status: 'pending',
      host: 'localhost',
      config: {},
    });
    await orchestrator.stopAgent('test3');
    // Access logs through the singleton
    const { agentLogStore } = require('../agentLogs');
    const logs = agentLogStore.getLogs('test3');
    expect(logs.length).toBeGreaterThanOrEqual(2);
    expect(logs[0].message).toContain('launched');
    expect(logs[1].message).toContain('stopped');
  });
});
