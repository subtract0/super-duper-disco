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
  const { id } = req.query;
  if (typeof id !== 'string') {
    res.status(400).json({ error: 'Invalid agent id (must be string)' });
    return;
  }
  if (req.method === "DELETE") {
    // Stop agent via orchestrator
    const agentManager = await getAgentManagerSingleton();
debugLog('[DEBUG][DELETE /api/agents/[id]] Incoming id:', id);
debugLog('[DEBUG][DELETE /api/agents/[id]] All agent IDs:', agentManager.listAgents().map(a => a.id));
const agentIds = agentManager.listAgents().map(a => a.id);
debugLog('[DEBUG][DELETE /api/agents/[id]] All agent IDs (redundant check):', agentIds);
    const orchestrator = await getOrchestratorSingleton();
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
    // Confirm removal from orchestrator and persistent registry
    const stillExists = orchestrator.getAgent(id);
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
    // Get agent details from orchestrator
    const agentManager = await getAgentManagerSingleton();
    debugLog('[DEBUG][GET /api/agents/[id]] Incoming id:', id);
    debugLog('[DEBUG][GET /api/agents/[id]] All agent IDs:', agentManager.listAgents().map(a => a.id));
    const agentIds = agentManager.listAgents().map(a => a.id);
    debugLog('[DEBUG][GET /api/agents/[id]] All agent IDs (redundant check):', agentIds);
    const orchestrator = await getOrchestratorSingleton();
    let agent = orchestrator.getAgent(id);
    if (!agent) {
      // Try to hydrate from persistent
      await (await import('../../../src/orchestration/agentManager')).AgentManager.hydrateFromPersistent();
      // Recreate orchestrator singleton to use the latest manager
      const { getOrchestratorSingleton } = await import('../../../src/orchestration/orchestratorSingleton');
      const newOrchestrator = await getOrchestratorSingleton();
      debugLog('[DEBUG][GET /api/agents/[id]] orchestrator.instanceId:', newOrchestrator.instanceId);
      agent = newOrchestrator.getAgent(id);
    }
    debugLog('[DEBUG][GET /api/agents/[id]] agent from orchestrator.getAgent:', agent, 'typeof:', typeof agent);
    if (!agent) {
      const allOrchIds = (await getOrchestratorSingleton()).listAgents().map(a => a.id);
      const allMgrIds = agentManager.listAgents().map(a => a.id);
      debugLog('[DEBUG][GET /api/agents/[id]] After hydration: orchestrator agent IDs:', allOrchIds);
      debugLog('[DEBUG][GET /api/agents/[id]] After hydration: agentManager agent IDs:', allMgrIds);
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
