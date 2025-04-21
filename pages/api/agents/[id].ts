import fs from 'fs';
import type { NextApiRequest, NextApiResponse } from "next";
import { getOrchestratorSingleton } from '../../../src/orchestration/orchestratorSingleton';
import { getAgentManagerSingleton } from '../../../src/orchestration/agentManagerSingleton';
import { getAgents, saveAgents } from '../../../__mocks__/persistentStore';
import type { Agent } from '../../../types/agent';

function debugLog(...args: any[]) {
  const msg = args.map((a: any) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
  fs.appendFileSync('test-debug.log', msg + '\n');
  // Also log to console
  console.log(...args);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  debugLog('[DEBUG][API][id] Handler entry:', JSON.stringify({ method: req.method, url: req.url, query: req.query, body: req.body }));
  const { id } = req.query;
  if (typeof id !== 'string' || !id) {
    debugLog('[ERROR][API][id] Invalid or missing id in req.query:', JSON.stringify(req.query));
    res.status(400).json({ error: 'Invalid or missing agent id (must be string)', query: req.query });
    return;
  }
  if (req.method === "DELETE") {
    // Stop agent via orchestrator
    const agentManager = await getAgentManagerSingleton();
    const orchestrator = await getOrchestratorSingleton();
    debugLog('[DEBUG][DELETE /api/agents/[id]] Incoming id:', id);
    const orchAgents = await orchestrator.listAgents();
    const mgrAgents = await agentManager.listAgents();
    debugLog('[DEBUG][DELETE /api/agents/[id]] orchestrator agents:', orchAgents.map(a => a.id));
    debugLog('[DEBUG][DELETE /api/agents/[id]] agentManager agents:', mgrAgents.map(a => a.id));
    // Defensive: Log existence in both orchestrator and agentManager before deletion
    debugLog('[DEBUG][DELETE /api/agents/[id]] orchestrator.hasAgent:', !!(await orchestrator.getAgent(id)));
    debugLog('[DEBUG][DELETE /api/agents/[id]] agentManager.has:', agentManager.agents.has(id));
    let found;
    try {
      found = await orchestrator.getAgent(id);
    } catch (err) {
      debugLog('[ERROR][DELETE /api/agents/[id]] orchestrator.getAgent threw:', err);
      res.status(500).json({ error: 'orchestrator.getAgent failed', detail: err instanceof Error ? err.message : err });
      return;
    }
    if (!found) {
      res.status(404).json({ error: 'Agent not found for deletion' });
      return;
    }
    await orchestrator.stopAgent(id);
    // Remove agent from agentManager
    if (agentManager.agents.has(id)) {
      agentManager.agents.delete(id);
      debugLog('[DEBUG][DELETE /api/agents/[id]] Agent removed from agentManager:', id);
      // Remove from persistent registry
      try {
        const { deleteAgentInfo } = await import('../../../src/orchestration/agentRegistry');
        await deleteAgentInfo(id);
      } catch (e) {
        debugLog('[ERROR][DELETE /api/agents/[id]] Failed to delete from persistent registry:', e);
      }
    }
    // Hydrate from persistent after deletion
    await (await import('../../../src/orchestration/agentManager')).AgentManager.hydrateFromPersistent();
    // Reset/recreate orchestrator singleton to use the latest AgentManager
    const { getOrchestratorSingleton } = await import('../../../src/orchestration/orchestratorSingleton');
    const newOrchestrator = await getOrchestratorSingleton();
    // Confirm removal from orchestrator and persistent registry
    const stillExists = await newOrchestrator.getAgent(id);
    const { getAgentInfo } = await import('../../../src/orchestration/agentRegistry');
    const stillInDb = await getAgentInfo(id);
    if (!stillExists && !stillInDb) {
      debugLog('[DEBUG][DELETE /api/agents/[id]] Agent successfully deleted:', id);
      res.status(200).json({ ok: true });
    } else {
      debugLog('[DEBUG][DELETE /api/agents/[id]] Agent NOT deleted (still exists):', id, { stillExists, stillInDb });
      res.status(404).json({ error: 'Agent could not be fully deleted' });
    }
  } else if (req.method === "GET") {
    debugLog('[DEBUG][GET /api/agents/[id]] Handler entered. id:', id);
    const agentManager = await getAgentManagerSingleton();
    const orchestrator = await getOrchestratorSingleton();
    const orchAgents = await orchestrator.listAgents();
    const mgrAgents = await agentManager.listAgents();
    debugLog('[DEBUG][GET /api/agents/[id]] orchestrator agents:', orchAgents.map(a => a.id));
    debugLog('[DEBUG][GET /api/agents/[id]] agentManager agents:', mgrAgents.map(a => a.id));
    debugLog('[DEBUG][GET /api/agents/[id]] Incoming id:', id);
    debugLog('[DEBUG][GET /api/agents/[id]] All agent IDs:', mgrAgents.map(a => a.id));
    const agentIds = mgrAgents.map(a => a.id);
    debugLog('[DEBUG][GET /api/agents/[id]] All agent IDs (redundant check):', agentIds);
    // Always rehydrate AgentManager before looking up the agent
    await (await import('../../../src/orchestration/agentManager')).AgentManager.hydrateFromPersistent();
    // Recreate orchestrator singleton to use the latest manager
    const { getOrchestratorSingleton } = await import('../../../src/orchestration/orchestratorSingleton');
    const newOrchestrator = await getOrchestratorSingleton();
    debugLog('[DEBUG][GET /api/agents/[id]] orchestrator.instanceId:', newOrchestrator.instanceId);
    let agent = await newOrchestrator.getAgent(id);
    const allOrchIds = (await newOrchestrator.listAgents()).map(a => a.id);
    const allMgrIds = (await agentManager.listAgents()).map(a => a.id);
    debugLog('[DEBUG][GET /api/agents/[id]] After hydration: orchestrator agent IDs:', allOrchIds);
    debugLog('[DEBUG][GET /api/agents/[id]] After hydration: agentManager agent IDs:', allMgrIds);
    // --- Enhanced lifecycle debug ---
    const mgrList = await agentManager.listAgents();
    const orchList = await newOrchestrator.listAgents();
    debugLog('[DEBUG][GET /api/agents/[id]] agentManager.listAgents() full:', mgrList.map(a => a.id));
    debugLog('[DEBUG][GET /api/agents/[id]] orchestrator.listAgents() full:', orchList.map(a => a.id));
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    // Always return the agent, even if status is 'crashed'
    const allOrchIds = (await getOrchestratorSingleton()).listAgents().map(a => a.id);
    const allMgrIds = agentManager.listAgents().map(a => a.id);
    debugLog('[DEBUG][GET /api/agents/[id]] Returning agent. Orchestrator agent IDs:', allOrchIds);
    debugLog('[DEBUG][GET /api/agents/[id]] Returning agent. AgentManager agent IDs:', allMgrIds);
    debugLog('[DEBUG][GET /api/agents/[id]] Returning agent object:', JSON.stringify(agent));
    res.status(200).json({ agent });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
