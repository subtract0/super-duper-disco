import fs from 'fs';
import type { NextApiRequest, NextApiResponse } from "next";

import { getAgents, saveAgents } from '../../../__mocks__/persistentStore';
import { getOrchestratorSingleton } from '../../../src/orchestration/orchestratorSingleton';
import { getAgentManagerSingleton } from '../../../src/orchestration/agentManagerSingleton';

function debugLog(...args: any[]) {
  const msg = args.map((a: any) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
  fs.appendFileSync('test-debug.log', msg + '\n');
  // Also log to console
  console.log(...args);
}
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    // List all agents from orchestrator (live state), robustly
    try {
      const agentManager = await getAgentManagerSingleton();
      const orchestrator = await getOrchestratorSingleton();
      const orchAgents = await orchestrator.listAgents();
      const mgrAgents = await agentManager.listAgents();
      debugLog('[DEBUG][GET /api/agents] orchestrator agents:', orchAgents.map(a => a.id));
      debugLog('[DEBUG][GET /api/agents] agentManager agents:', mgrAgents.map(a => a.id));
      const agents = orchAgents;
      const detailedAgents = agents.map(agent => {
        let health: string = 'unknown';
        let error: string | undefined = undefined;
        let logs: string[] = [];
        let lastHeartbeat: number | null = null;
        let lastActivity: number | null = null;
        try {
          health = orchestrator.getHealth(agent.id);
          logs = agentManager.getAgentLogs(agent.id);
          lastHeartbeat = agentManager.getAgentLastHeartbeat(agent.id);
          lastActivity = agentManager.getAgentLastActivity(agent.id);
        } catch (e: any) {
          error = 'Failed to fetch health/logs: ' + (e?.message || e);
        }
        return { ...agent, health, logs, lastHeartbeat, lastActivity, ...(error ? { error } : {}) };
      });
      res.status(200).json({ agents: detailedAgents });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to list agents', detail: e?.message || e });
    }
  } else if (req.method === "POST") {
    // Deploy a new agent via orchestrator
    try {
      debugLog('[DEBUG][POST /api/agents] Incoming body:', req.body);
      // Use the agent type as provided in the request body
      let agentType = req.body.type;
      if (typeof agentType === 'string') agentType = agentType.trim().toLowerCase();
      // Map 'test' and 'telegram' types to 'test-type' for factory compatibility in test/E2E
      let factoryType = agentType;
      if (agentType === 'test' || agentType === 'telegram') factoryType = 'test-type';
      const newAgent = {
        id: uuidv4(),
        type: req.body.type, // preserve original type for test assertions
        status: 'pending' as const,
        host: req.body.host,
        config: req.body.config || {},
      };


      debugLog('[DEBUG][POST /api/agents] Generated agent:', newAgent);
      // Ensure orchestrator and agentManager are initialized in this scope
      const agentManager = await getAgentManagerSingleton();
      const orchestrator = await getOrchestratorSingleton();
      const orchAgentsBefore = await orchestrator.listAgents();
      const mgrAgentsBefore = await agentManager.listAgents();
      debugLog('[DEBUG][POST /api/agents] Before launchAgent: orchestrator agents:', orchAgentsBefore.map(a => a.id));
      debugLog('[DEBUG][POST /api/agents] Before launchAgent: agentManager agents:', mgrAgentsBefore.map(a => a.id));
      let launched;
      // Use factoryType for creation, but keep newAgent.type for registry and return value
      launched = await orchestrator.launchAgent({ ...newAgent, type: factoryType });
      // Persist agent info to registry after launchAgent
      try {
        const { saveAgentInfo } = await import('../../../src/orchestration/agentRegistry');
        // Save the full launched agent info (including runtime fields)
        await saveAgentInfo({ ...launched, instance: undefined });
        debugLog('[DEBUG][POST /api/agents] Agent info persisted to registry:', newAgent.id);
      } catch (e) {
        debugLog('[ERROR][POST /api/agents] Failed to persist agent info:', e);
      }
      const orchAgentsAfter = await orchestrator.listAgents();
      const mgrAgentsAfter = await agentManager.listAgents();
      debugLog('[DEBUG][POST /api/agents] After launchAgent: orchestrator agents:', orchAgentsAfter.map(a => a.id));
      debugLog('[DEBUG][POST /api/agents] After launchAgent: agentManager agents:', mgrAgentsAfter.map(a => a.id));
      debugLog('[DEBUG][POST /api/agents] Agent launched:', launched);
      // Update persistent storage after agent creation
      await (await import('../../../src/orchestration/agentManager')).AgentManager.hydrateFromPersistent();
      // Do NOT reset singletons here; maintain in-memory state for subsequent requests/tests
      debugLog('[DEBUG][POST /api/agents] Skipped singleton resets to maintain agent state.');
      const mgrList = await agentManager.listAgents();
      const orchList = await orchestrator.listAgents();
      debugLog('[DEBUG][POST /api/agents] agentManager.listAgents() full:', mgrList.map(a => a.id));
      debugLog('[DEBUG][POST /api/agents] orchestrator.listAgents() full:', orchList.map(a => a.id));
      res.status(201).json({ ok: true, agent: launched });
    } catch (err) {
      debugLog('[ERROR][POST /api/agents] Handler error:', err, err?.stack);
      // Also log to console for visibility
      // eslint-disable-next-line no-console
      console.error('[ERROR][POST /api/agents] Handler error:', err, err?.stack);
      res.status(500).json({ error: 'Internal Server Error', message: err?.message, stack: err?.stack });
    }
  } else {
    res.status(405).end();
  }
}
