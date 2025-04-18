import type { NextApiRequest, NextApiResponse } from "next";
import { orchestrator } from '../../../src/orchestration/orchestratorSingleton';
import { getAgents, saveAgents } from '../../../__mocks__/persistentStore';
import type { Agent } from '../../../types/agent';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    res.status(400).json({ error: 'Invalid agent id (must be string)' });
    return;
  }
  if (req.method === "DELETE") {
    // Stop agent via orchestrator
    const found = orchestrator.getAgent(id);
    if (!found) {
      res.status(404).json({ error: 'Agent not found for deletion' });
      return;
    }
    await orchestrator.stopAgent(id);
    // After stop, agent remains in orchestrator's list with status 'crashed'. Return the updated agent.
    const updated = orchestrator.getAgent(id);
    res.status(200).json({ ok: true, agent: updated });
  } else if (req.method === "GET") {
    // Get agent details from orchestrator
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
