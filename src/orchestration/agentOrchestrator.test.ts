jest.mock('./supabaseAgentOps', () => ({
  logAgentHealthToSupabase: jest.fn().mockResolvedValue(undefined),
  fetchAgentLogsFromSupabase: jest.fn().mockResolvedValue([]),
}));

import { AgentOrchestrator, OrchestratedAgent } from './agentOrchestrator';
import { agentManager } from './agentManager';

describe('AgentOrchestrator', () => {
  let orchestrator: AgentOrchestrator;
  beforeEach(() => {
    orchestrator = new AgentOrchestrator();
    // Reset all running agents
    agentManager.listAgents().forEach(agent => agentManager.stopAgent(agent.id));
  });

  test('should launch a real agent and reflect health', async () => {
    const agentConfig: OrchestratedAgent = {
      id: 'orch-agent-1',
      type: 'test-type',
      status: 'pending',
      host: 'localhost',
      config: {},
    };
    await orchestrator.launchAgent(agentConfig);
    // Should be running in agentManager
    const agentInfo = agentManager.listAgents().find(a => a.id === agentConfig.id);
    expect(agentInfo).toBeDefined();
    expect(agentInfo!.status).toBe('running');
    // Orchestrator health should be healthy
    expect(orchestrator.getHealth(agentConfig.id)).toBe('healthy');
  });

  test('should stop a real agent and reflect health', async () => {
    const agentConfig: OrchestratedAgent = {
      id: 'orch-agent-2',
      type: 'test-type',
      status: 'pending',
      host: 'localhost',
      config: {},
    };
    await orchestrator.launchAgent(agentConfig);
    await orchestrator.stopAgent(agentConfig.id);
    const agentInfo = agentManager.listAgents().find(a => a.id === agentConfig.id);
    expect(agentInfo).toBeDefined();
    expect(agentInfo!.status).toBe('stopped');
    // Orchestrator health should be crashed
    expect(orchestrator.getHealth(agentConfig.id)).toBe('crashed');
  });

  test('should list all orchestrated agents', async () => {
    const agentConfig: OrchestratedAgent = {
      id: 'orch-agent-3',
      type: 'test-type',
      status: 'pending',
      host: 'localhost',
      config: {},
    };
    await orchestrator.launchAgent(agentConfig);
    const agents = orchestrator.listAgents();
    expect(agents.some(a => a.id === agentConfig.id)).toBe(true);
  });

  test('should review a developer implementation with QC Agent', async () => {
    jest.resetModules();
    jest.mock('./agents/qcAgent', () => {
      return {
        QCAgent: jest.fn().mockImplementation(() => ({
          reviewImplementation: jest.fn().mockResolvedValue('PASS: Looks good!'),
        })),
      };
    });
    const { AgentOrchestrator } = require('./agentOrchestrator');
    const orchestrator = new AgentOrchestrator();
    const ticket = 'Implement login feature';
    const implementation = 'function login() { /* ... */ } // tests pass';
    const result = await orchestrator.reviewWithQC(ticket, implementation, 'dummy-key');
    expect(result).toContain('PASS');
  });

  test('should auto-recover a crashed agent and reflect live state', async () => {
    const agentConfig: OrchestratedAgent = {
      id: 'orch-agent-crash-1',
      type: 'test-type',
      status: 'pending',
      host: 'localhost',
      config: {},
    };
    await orchestrator.launchAgent(agentConfig);
    // Simulate crash by stopping the agent via orchestrator (ensures state sync)
    await orchestrator.stopAgent(agentConfig.id);
    // Orchestrator should now see the agent as crashed
    expect(orchestrator.getHealth(agentConfig.id)).toBe('crashed');
    // Now trigger orchestrator auto-recovery
    const recoveryResult = await orchestrator.restartAgent(agentConfig.id);
    expect(recoveryResult).toBe('recovered');
    // Health should now be 'recovered'
    expect(orchestrator.getHealth(agentConfig.id)).toBe('recovered');
    // Check agent is still present in orchestrator list
    const agents = orchestrator.listAgents();
    expect(agents.some(a => a.id === agentConfig.id)).toBe(true);
  });
});
