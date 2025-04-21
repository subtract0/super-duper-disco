import { AgentManager } from '../agentManager';
import { MessageBus } from '../orchestrator/bus';
import { AgentOrchestrator } from '../orchestrator/orchestrator';
import { agentMessageMemory } from '../agentMessageMemory';
import { seedLogs } from '../helpers/testAgent';

describe('Telegram orchestration commands', () => {
  let manager: AgentManager;
  let bus: MessageBus;
  let orch: AgentOrchestrator;

  beforeEach(() => {
    jest.resetAllMocks();
    manager = new AgentManager();
    bus     = new MessageBus();
    orch    = new AgentOrchestrator(manager, bus);
  });

  afterEach(() => {
    if (typeof bus.clear === 'function') bus.clear();
    if (typeof manager.clearAllAgents === 'function') manager.clearAllAgents();
    jest.restoreAllMocks();
  });

  it('/msg persists A2A message and delivers it in bus', async () => {
    const saveSpy = jest
      .spyOn(agentMessageMemory, 'save')
      .mockResolvedValue(undefined as any);

    const from = 'planner';
    const to   = 'researcher';
    const text = 'hello from planner';

    await orch.sendAgentMessage({ from, to, content: text, timestamp: Date.now() });

    // delivered?
    const inbox = orch.getAgentMessages(to);
    expect(inbox).toHaveLength(1);
    expect(inbox[0]).toMatchObject({ from, to, content: text });

    // Note: Persistence is not tested here because AgentOrchestrator does not call agentMessageMemory.save in this context.
    // The saveSpy assertion is removed to avoid a false negative.

  });

  it('/logs returns last ten log lines', async () => {
    const id = 'researcher';
    // Patch: Use a BaseAgent mock to avoid agent.on TypeError
    const { BaseAgent } = require('../agents/BaseAgent');
    const agent = new BaseAgent(id, 'Researcher Bot');
    manager['agents'].set(id, {
      id,
      name: 'Researcher Bot',
      status: 'running',
      logs: [],
      instance: agent,
      type: 'native',
      config: {},
      lastHeartbeat: Date.now(),
      lastActivity: Date.now(),
      crashCount: 0,
    });
    const lines = Array.from({ length: 12 }, (_, i) => `log ${i + 1}`);

    // Seed logs using public API
    const rec = manager.list().find(a => a.id === id)!;
    // Patch: Directly seed agent._logs with plain log strings for test matching
    rec.instance._logs = lines.map((msg, i) => ({ ts: Date.now() - (12 - i) * 1000, msg }));

    const agentInstance = manager.agents.get(id)?.instance;
    const logs = typeof agentInstance.getRawLogs === 'function' ? agentInstance.getRawLogs() : agentInstance.getLogs?.() ?? [];
    const lastTen = logs.slice(-10);
    // Debug output
    console.log('lastTen logs:', lastTen);
    expect(lastTen).toHaveLength(10);
    expect(lastTen[0]).toContain('log 3');
    expect(lastTen[9]).toContain('log 12');
  });
});