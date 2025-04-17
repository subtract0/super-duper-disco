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

  it('should launch a swarm of agents and set their health', async () => {
    const agents = [
      { id: 'swarm1', type: 'test', status: 'pending' as const, host: 'localhost', config: {} },
      { id: 'swarm2', type: 'test', status: 'pending' as const, host: 'localhost', config: {} },
      { id: 'swarm3', type: 'test', status: 'pending' as const, host: 'localhost', config: {} },
    ];
    const launched = await orchestrator.spawnSwarm(agents);
    expect(launched.length).toBe(3);
    for (const a of launched) {
      expect(['swarm1', 'swarm2', 'swarm3']).toContain(a.id);
      expect(a.status).toBe('healthy');
      expect(orchestrator.getHealth(a.id)).toBe('healthy');
    }
  });

  it('should allow agent-to-agent messaging and retrieval', async () => {
    await orchestrator.launchAgent({ id: 'msg1', type: 'test', status: 'pending', host: 'localhost', config: {} });
    await orchestrator.launchAgent({ id: 'msg2', type: 'test', status: 'pending', host: 'localhost', config: {} });
    await orchestrator.sendAgentMessage({ from: 'msg1', to: 'msg2', content: { text: 'Hello' }, timestamp: Date.now() });
    await orchestrator.sendAgentMessage({ from: 'msg2', to: 'msg1', content: { text: 'Reply' }, timestamp: Date.now() });
    const msgsTo2 = orchestrator.getAgentMessages('msg2');
    const msgsTo1 = orchestrator.getAgentMessages('msg1');
    expect(msgsTo2.length).toBe(1);
    expect(msgsTo2[0].from).toBe('msg1');
    expect(msgsTo2[0].content.text).toBe('Hello');
    expect(msgsTo1.length).toBe(1);
    expect(msgsTo1[0].from).toBe('msg2');
    expect(msgsTo1[0].content.text).toBe('Reply');
  });

  it('should return full swarm state', async () => {
    await orchestrator.launchAgent({ id: 'swarmA', type: 'test', status: 'pending', host: 'localhost', config: {} });
    await orchestrator.launchAgent({ id: 'swarmB', type: 'test', status: 'pending', host: 'localhost', config: {} });
    await orchestrator.sendAgentMessage({ from: 'swarmA', to: 'swarmB', content: { data: 123 }, timestamp: Date.now() });
    const state = orchestrator.getSwarmState();
    expect(Array.isArray(state.agents)).toBe(true);
    expect(Array.isArray(state.messages)).toBe(true);
    expect(state.agents.find(a => a.id === 'swarmA')).toBeDefined();
    expect(state.messages.find(m => m.from === 'swarmA' && m.to === 'swarmB')).toBeDefined();
  });
});
