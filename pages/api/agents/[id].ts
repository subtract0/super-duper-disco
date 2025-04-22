import fs from 'fs';
import type { NextApiRequest, NextApiResponse } from "next";
import { getOrchestratorSingleton } from '../../../src/orchestration/orchestratorSingleton';
import { getAgentManagerSingleton } from '../../../src/orchestration/agentManagerSingleton';
// Removed unused imports: getAgents, saveAgents, Agent

// Improved debug logger with timestamp
function debugLog(...args: any[]) {
  const timestamp = new Date().toISOString();
  const msg = args.map((a: any) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
  const logLine = `${timestamp} ${msg}\n`;
  try {
    fs.appendFileSync('test-debug.log', logLine);
  } catch (err) {
    console.error("Failed to write to debug log file:", err);
  }
  console.log(...args);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  debugLog(`[API][${req.method} /api/agents/${id || ''}] Handler entry.`);

  if (typeof id !== 'string' || !id) {
    debugLog(`[API][ERROR] Invalid or missing agent id:`, JSON.stringify(req.query));
    return res.status(400).json({ error: 'Invalid or missing agent id (must be string)', query: req.query });
  }

  // Get singletons once per request
  const orchestrator = await getOrchestratorSingleton();

  if (req.method === "DELETE") {
    // Stop agent via orchestrator
    const agentManager = await getAgentManagerSingleton();
    const orchestrator = await getOrchestratorSingleton();
    debugLog(`[API][DELETE /api/agents/${id}] Attempting to stop/delete agent.`);
    try {
      const agentExists = await orchestrator.getAgent(id);
      if (!agentExists) {
        debugLog(`[API][DELETE /api/agents/${id}] Agent not found.`);
        return res.status(404).json({ error: 'Agent not found' });
      }
      await orchestrator.stopAgent(id); // Assumes full cleanup
      const stillExists = await orchestrator.getAgent(id);
      if (!stillExists) {
        debugLog(`[API][DELETE /api/agents/${id}] Agent successfully stopped and presumed deleted.`);
        return res.status(200).json({ message: 'Agent stopped and deleted successfully' });
      } else {
        debugLog(`[API][DELETE /api/agents/${id}] Agent stopped, but might still exist in lists shortly after deletion.`, stillExists);
        return res.status(200).json({ message: 'Agent stop requested, final deletion might be asynchronous.' });
      }
    } catch (err) {
      debugLog(`[API][DELETE /api/agents/${id}] Error during agent stop/deletion:`, err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: 'Failed to stop/delete agent', detail: errorMessage });
    }
  } else if (req.method === "GET") {
    debugLog(`[API][GET /api/agents/${id}] Attempting to retrieve agent.`);
    try {
      const agent = await orchestrator.getAgent(id);
      if (!agent) {
        debugLog(`[API][GET /api/agents/${id}] Agent not found.`);
        return res.status(404).json({ error: 'Agent not found' });
      }
      debugLog(`[API][GET /api/agents/${id}] Agent found, returning data.`);
      return res.status(200).json({ agent });
    } catch (err) {
      debugLog(`[API][GET /api/agents/${id}] Error retrieving agent:`, err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: 'Failed to retrieve agent', detail: errorMessage });
    }
  } else {
    debugLog(`[API][${req.method} /api/agents/${id}] Method not allowed.`);
    res.setHeader('Allow', ['GET', 'DELETE']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}
