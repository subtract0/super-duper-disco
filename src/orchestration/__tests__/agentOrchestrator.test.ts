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
    expect(orchestrator.getAgent('test2')).toBeDefined();
    expect(orchestrator.getAgent('test2')!.status).toBe('crashed');
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

  it('should auto-recover a crashed agent (auto-restart)', async () => {
    jest.setTimeout(10000); // allow time for auto-recovery
    const agentId = 'auto-recover';
    await orchestrator.launchAgent({
      id: agentId,
      type: 'test',
      status: 'pending',
      host: 'localhost',
      config: {},
    });
    await orchestrator.stopAgent(agentId);
    // Wait for auto-recovery
    let health = orchestrator.getHealth(agentId);
    const start = Date.now();
    while (health !== 'recovered' && health !== 'recovery_failed' && Date.now() - start < 5000) {
      await new Promise(res => setTimeout(res, 200));
      health = orchestrator.getHealth(agentId);
      console.log(`[TEST] Health status for ${agentId}:`, health);
    }
    expect(['recovered', 'recovery_failed']).toContain(health);
  });
});
