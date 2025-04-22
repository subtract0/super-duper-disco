import fs from 'fs';
import type { NextApiRequest, NextApiResponse } from "next";
import { v4 as uuidv4 } from 'uuid';
// Removed unused mock imports

function debugLog(...args: any[]) {
  const timestamp = new Date().toISOString();
  const msg = args.map((a: any) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
  const logLine = `${timestamp} ${msg}\n`;
  try { fs.appendFileSync('test-debug.log', logLine); } catch (err) { console.error("Failed to write to debug log file:", err); }
  console.log(...args);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // --- GET Request ---
  if (req.method === "GET") {
    try {
      debugLog('[API][GET /api/agents] Fetching agent list...');
      const { getAgentManagerSingleton } = await import('../../../src/orchestration/agentManagerSingleton');
      const { getOrchestratorSingleton } = await import('../../../src/orchestration/orchestratorSingleton');
      const agentManager = await getAgentManagerSingleton();
      const orchestrator = await getOrchestratorSingleton();
      const agents = await orchestrator.listAgents();
      debugLog(`[API][GET /api/agents] Found ${agents.length} agents via orchestrator. Enriching details...`);
      const detailedAgents = agents.map(agent => {
        let health: string | undefined = undefined;
        let error: string | undefined = undefined;
        let logs: string[] = [];
        let lastHeartbeat: number | null = null;
        let lastActivity: number | null = null;
        try {
          const agentHealthStatus = agentManager.getAgentHealth(agent.id);
          health = String(agentHealthStatus);
          logs = agentManager.getAgentLogs(agent.id);
          lastHeartbeat = agentManager.getAgentLastHeartbeat(agent.id);
          lastActivity = agentManager.getAgentLastActivity(agent.id);
        } catch (e: any) {
          const errorMsg = e instanceof Error ? e.message : String(e);
          error = `Failed to fetch details for agent ${agent.id}: ${errorMsg}`;
          console.error(error);
        }
        return { ...agent, health, logs, lastHeartbeat, lastActivity, ...(error ? { error } : {}) };
      });
      debugLog(`[API][GET /api/agents] Returning ${detailedAgents.length} enriched agents.`);
      res.status(200).json({ agents: detailedAgents });
    } catch (e: any) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error('[API][GET /api/agents] Failed to list agents:', e);
      res.status(500).json({ error: 'Failed to list agents', detail: errorMsg });
    }
  }
  // --- POST Request ---
  else if (req.method === "POST") {
    // Deploy a new agent via orchestrator
    try {
      debugLog('[API][POST /api/agents] Received request body:', req.body);
      const { type, host, config, name: agentName } = req.body;
      if (typeof type !== 'string' || !type) {
        return res.status(400).json({ error: 'Missing or invalid agent type in request body.' });
      }
      const agentType = type.trim();
      const agentId = uuidv4();
      const launchConfig = {
        id: agentId,
        name: agentName || `agent-${agentId.substring(0, 8)}`,
        type: agentType,
        config: config || {},
        host
      };
      debugLog('[API][POST /api/agents] Prepared launchConfig:', launchConfig);
      const { getAgentManagerSingleton } = await import('../../../src/orchestration/agentManagerSingleton');
      const { getOrchestratorSingleton } = await import('../../../src/orchestration/orchestratorSingleton');
      const agentManager = await getAgentManagerSingleton();
      const orchestrator = await getOrchestratorSingleton();
      const mgrAgentsBefore = await agentManager.listAgents();
      debugLog('[DEBUG][POST /api/agents] Before launchAgent: agentManager agents:', mgrAgentsBefore.map(a => a.id));
      const launchedAgent = await orchestrator.launchAgent(launchConfig);
      // No explicit saveAgentInfo or hydrateFromPersistent here!
      const mgrAgentsAfter = await agentManager.listAgents();
      debugLog('[DEBUG][POST /api/agents] After launchAgent: agentManager agents:', mgrAgentsAfter.map(a => a.id));
      const agentFromGet = await orchestrator.getAgent(launchedAgent.id);
      debugLog(`[DEBUG][POST /api/agents] Immediate getAgent(${launchedAgent.id}) result:`, agentFromGet ? 'Found' : 'Not Found');
      debugLog(`[API][POST /api/agents] Agent ${launchedAgent.id} launched successfully.`);
      res.status(201).json({ ok: true, agent: launchedAgent });
    } catch (err: any) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      console.error('[API][POST /api/agents] Failed to launch agent:', err);
      debugLog('[ERROR][POST /api/agents] Handler error details:', errorMsg, stack);
      res.status(500).json({ error: 'Failed to launch agent', detail: errorMsg });
    }
  }
  // --- Method Not Allowed ---
  else {
    debugLog(`[API][${req.method}] Method not allowed for /api/agents`);
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

