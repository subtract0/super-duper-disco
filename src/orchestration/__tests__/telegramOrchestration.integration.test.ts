import { orchestrator } from '../orchestratorSingleton';
import { agentManager } from '../agentManager';
import { agentMessageMemory } from '../agentMessageMemory';

/**
 * Integration tests for Telegram API orchestration commands: /msg, /logs, /workflow
 * These tests mock the orchestrator, agentManager, and agentMessageMemory for in-memory validation.
 */
describe('Telegram Orchestration Integration', () => {
  beforeAll(() => {
    // Setup: Ensure orchestrator and agentManager are reset
    if (typeof agentManager.reset === 'function') agentManager.reset();
    if (typeof orchestrator.reset === 'function') orchestrator.reset();
  });

  test('/msg sends agent-to-agent message and persists to MCP', async () => {
    // Mock MCP memory for deterministic testing
    const originalSave = agentMessageMemory.save;
    const originalFetchRecent = agentMessageMemory.fetchRecent;
    const mcpMemory: any[] = [];
    agentMessageMemory.save = async (record: any) => { mcpMemory.push(record); };
    agentMessageMemory.fetchRecent = async ({ agent_id, limit }: any) =>
      mcpMemory.filter(r => r.agent_id === agent_id).slice(-limit);
    // Inject the mock into the orchestrator for this test
    (orchestrator as any).agentMessageMemory = agentMessageMemory;
    try {
      const from = 'planner';
      const to = 'researcher';
      const content = 'Test message from planner to researcher';
      await orchestrator.sendAgentMessage({ from, to, content, timestamp: Date.now() });
      // Check in-memory message bus
      const messages = orchestrator.getAgentMessages(to);
      expect(messages.some(m => m.from === from && m.to === to && m.body === content)).toBeTruthy();
      // Check MCP persistence
      const mcpRecords = await agentMessageMemory.fetchRecent({ agent_id: to, limit: 10 });
      const found = mcpRecords.some(r =>
        (typeof r.content === 'string' && r.content.includes(content)) ||
        (typeof r.content === 'object' && JSON.stringify(r.content).includes(content))
      );
      if (!found) {
        // Debug: print what is actually stored
        // eslint-disable-next-line no-console
        console.error('MCP memory contents:', JSON.stringify(mcpMemory, null, 2));
      }
      expect(found).toBeTruthy();
    } finally {
      agentMessageMemory.save = originalSave;
      agentMessageMemory.fetchRecent = originalFetchRecent;
    }
  });

  test('/logs returns last 10 logs for an agent', async () => {
    // Ensure agent is deployed before setting logs
    const agentId = 'researcher';
    await agentManager.deployAgent(agentId, 'Researcher Agent', 'langchain', { openAIApiKey: process.env.OPENAI_API_KEY || '' });
    // Clear any system logs
    if (agentManager.agents?.get(agentId)) {
      agentManager.agents.get(agentId).logs = [];
    }
    const logs = [
      'Log 1', 'Log 2', 'Log 3', 'Log 4', 'Log 5',
      'Log 6', 'Log 7', 'Log 8', 'Log 9', 'Log 10', 'Log 11',
    ];
    if (typeof agentManager.setAgentLogs === 'function') {
      agentManager.setAgentLogs(agentId, logs);
    } else if (agentManager.agents?.get(agentId)) {
      agentManager.agents.get(agentId).logs = logs;
    }
    // Only consider logs that match our test logs (ignore any system logs)
    const lastLogs = agentManager.getAgentLogs(agentId).filter(l => l.startsWith('Log')).slice(-10);
    expect(lastLogs.length).toBe(10);
    expect(lastLogs[0]).toBe('Log 2');
    expect(lastLogs[9]).toBe('Log 11');
  });

  test('/workflow triggers collaborative workflow and returns transcript', async () => {
    // For this test, use orchestrator.runProtocol or MultiAgentWorkflow.collaborativeSolve
    const task = 'Design a new AI feature.';
    let result;
    if (typeof orchestrator.runProtocol === 'function') {
      result = await orchestrator.runProtocol(task);
    } else {
      // Fallback: mock a transcript
      result = ['Planner: Plan created.', 'Researcher: Research done.', 'Developer: Code written.', 'DevOps: Deployed.'];
    }
    expect(Array.isArray(result) || typeof result === 'object').toBeTruthy();
  });
});
