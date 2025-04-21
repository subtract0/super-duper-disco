import fs from 'fs';
import type { NextApiRequest, NextApiResponse } from "next";
import { orchestrator } from '../../../src/orchestration/orchestratorSingleton';
import { agentManager } from '../../../src/orchestration/agentManagerSingleton';
import { getAgents, saveAgents } from '../../../__mocks__/persistentStore';
import type { Agent } from '../../../types/agent';

function debugLog(...args: any[]) {
  const msg = args.map((a: any) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
  fs.appendFileSync('test-debug.log', msg + '\n');
  // Also log to console
  console.log(...args);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    res.status(400).json({ error: 'Invalid agent id (must be string)' });
    return;
  }
  if (req.method === "DELETE") {
    // Stop agent via orchestrator
debugLog('[DEBUG][DELETE /api/agents/[id]] Incoming id:', id);
debugLog('[DEBUG][DELETE /api/agents/[id]] All agent IDs:', agentManager.listAgents().map(a => a.id));
const agentIds = agentManager.listAgents().map(a => a.id);
debugLog('[DEBUG][DELETE /api/agents/[id]] All agent IDs (redundant check):', agentIds);
    const found = orchestrator.getAgent(id);
    if (!found) {
      res.status(404).json({ error: 'Agent not found for deletion' });
      return;
    }
    await orchestrator.stopAgent(id);
    // Remove agent from agentManager
    if (agentManager.agents.has(id)) {
      agentManager.agents.delete(id);
      debugLog('[DEBUG][DELETE /api/agents/[id]] Agent removed from agentManager:', id);
    }
    // Confirm removal from orchestrator
    const stillExists = orchestrator.getAgent(id);
    if (!stillExists) {
      debugLog('[DEBUG][DELETE /api/agents/[id]] Agent successfully deleted:', id);
      res.status(200).json({ ok: true });
    } else {
      debugLog('[DEBUG][DELETE /api/agents/[id]] Agent NOT deleted (still exists):', id);
      res.status(404).json({ error: 'Agent could not be fully deleted' });
    }
  } else if (req.method === "GET") {
    // Get agent details from orchestrator
    debugLog('[DEBUG][GET /api/agents/[id]] Incoming id:', id);
debugLog('[DEBUG][GET /api/agents/[id]] All agent IDs:', agentManager.listAgents().map(a => a.id));
const agentIds = agentManager.listAgents().map(a => a.id);
debugLog('[DEBUG][GET /api/agents/[id]] All agent IDs (redundant check):', agentIds);
    const agent = orchestrator.getAgent(id);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    // Always return the agent, even if status is 'crashed'
    res.status(200).json({ agent });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
