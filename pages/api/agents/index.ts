import fs from 'fs';
import type { NextApiRequest, NextApiResponse } from "next";

import { getAgents, saveAgents } from '../../../__mocks__/persistentStore';

function debugLog(...args: any[]) {
  const msg = args.map((a: any) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
  fs.appendFileSync('test-debug.log', msg + '\n');
  // Also log to console
  console.log(...args);
}
import { v4 as uuidv4 } from 'uuid';
import { getOrchestratorSingleton } from '../../../src/orchestration/orchestratorSingleton';
import { getAgentManagerSingleton } from '../../../src/orchestration/agentManagerSingleton';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    // List all agents from orchestrator (live state), robustly
    try {
      const agentManager = await getAgentManagerSingleton();
      const orchestrator = await getOrchestratorSingleton();
      const agents = orchestrator.listAgents();
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
      const agentType = req.body.type;
      const newAgent = {
        id: uuidv4(),
        type: agentType,
        status: 'pending' as const,
        host: req.body.host,
        config: req.body.config || {},
      };

      debugLog('[DEBUG][POST /api/agents] Generated agent:', newAgent);
      const orchestrator = await getOrchestratorSingleton();
      let launched;
      try {
        launched = await orchestrator.launchAgent(newAgent);
        debugLog('[DEBUG][POST /api/agents] Agent launched:', launched);
      } catch (e) {
        debugLog('[ERROR][POST /api/agents] Failed to launch agent:', e);
        res.status(500).json({ error: 'Failed to launch agent', details: String(e) });
        return;
      }
      // Hydrate AgentManager and orchestrator to ensure state is up to date
      await (await import('../../../src/orchestration/agentManager')).AgentManager.hydrateFromPersistent();
      // Recreate orchestrator singleton with the new hydrated manager
      const { getOrchestratorSingleton } = await import('../../../src/orchestration/orchestratorSingleton');
      const newOrchestrator = await getOrchestratorSingleton();
      debugLog('[DEBUG][POST /api/agents] orchestrator.instanceId:', newOrchestrator.instanceId);
      const agent = newOrchestrator.getAgent(newAgent.id);
      const allOrchIds = newOrchestrator.listAgents().map(a => a.id);
      const allMgrIds = agentManager.listAgents().map(a => a.id);
      debugLog('[DEBUG][POST /api/agents] After hydration: orchestrator agent IDs:', allOrchIds);
      debugLog('[DEBUG][POST /api/agents] After hydration: agentManager agent IDs:', allMgrIds);
      res.status(201).json({ agent });
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
