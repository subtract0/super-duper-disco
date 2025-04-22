// NOTE: All agent mocks used with AgentManager.deployAgent MUST implement EventEmitter (e.g., use BaseAgent or a compatible class).
// This prevents TypeError: agent.on is not a function during tests. See PLAN.md for regression-proofing details.
/**
 * @jest-environment node
 */

jest.mock('./supabaseAgentOps', () => ({
  logAgentHealthToSupabase: jest.fn().mockResolvedValue(undefined),
  fetchAgentLogsFromSupabase: jest.fn().mockResolvedValue([]),
}));

import { agentManager } from './agentManagerSingleton';
import { orchestrator } from './orchestratorSingleton';
import { OrchestratedAgent } from './agentOrchestrator';

describe('AgentOrchestrator', () => {
  beforeEach(async () => {
    // No clearAllAgents method on agentManager; ensure clean state by stopping agents if needed.
    // If you want to clear agents, implement a helper or mock as needed.
  });

  test('should launch a real agent and reflect health', async () => {
    const agentConfig: OrchestratedAgent = {
      id: 'orch-agent-1',
      name: 'orch-agent-1',
      type: 'test-type',
      status: 'pending',
      host: 'localhost',
      config: {},
    };
    await orchestrator.launchAgent(agentConfig);
    // Should be running in agentManager
    const agentList = await agentManager.listAgents();
    const agentInfo = agentList.find((a) => a.id === agentConfig.id);
    expect(agentInfo).toBeDefined();
    expect(agentInfo!.status).toBe('running');
    // Orchestrator health should be healthy
    expect(orchestrator.getHealth(agentConfig.id)).toBe('healthy');
  });

  test('should stop a real agent and reflect health', async () => {
    const agentConfig: OrchestratedAgent = {
      id: 'orch-agent-2',
      name: 'orch-agent-2',
      type: 'test-type',
      status: 'pending',
      host: 'localhost',
      config: {},
    };
    await orchestrator.launchAgent(agentConfig);
    await orchestrator.stopAgent(agentConfig.id);
    const agentList = await agentManager.listAgents();
    const agentInfo = agentList.find((a) => a.id === agentConfig.id);
    expect(agentInfo).toBeDefined();
    expect(agentInfo!.status).toBe('stopped');
    // Orchestrator health should be crashed
    expect(orchestrator.getHealth(agentConfig.id)).toBe('crashed');
  });

  test('should list all orchestrated agents', async () => {
    const agentConfig: OrchestratedAgent = {
      id: 'orch-agent-3',
      name: 'orch-agent-3',
      type: 'test-type',
      status: 'pending',
      host: 'localhost',
      config: {},
    };
    await orchestrator.launchAgent(agentConfig);
    const agents = await orchestrator.listAgents();
    expect(agents.some((a) => a.id === agentConfig.id)).toBe(true);
  });


  test('should auto-recover a crashed agent and reflect live state', async () => {
    // DEBUG: Log agent list before launch
    const agentsBefore = await orchestrator.listAgents();
    console.log('Before launch:', agentsBefore);
    const agentConfig: OrchestratedAgent = {
      id: 'orch-agent-crash-1',
      name: 'orch-agent-crash-1',
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
    // DEBUG: Log agent list after restart
    const agentsAfter = await orchestrator.listAgents();
    console.log('After restart:', agentsAfter);
    expect(recoveryResult).toBe('recovered');
    // Health should now be 'recovered'
    expect(orchestrator.getHealth(agentConfig.id)).toBe('recovered');
    // Check agent is still present in orchestrator list
    const agents = await orchestrator.listAgents();
    expect(agents.some((a) => a.id === agentConfig.id)).toBe(true);
  });
});
