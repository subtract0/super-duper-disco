import type { NextApiRequest, NextApiResponse } from "next";
import { orchestrator } from "./index";
import { getAgents, saveAgents } from '../../../__mocks__/persistentStore';
import type { Agent } from '../../../types/agent';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    res.status(400).json({ error: 'Invalid agent id (must be string)' });
    return;
  }
  if (req.method === "DELETE") {
    // Stop agent via orchestrator and remove from persistent store
    await orchestrator.stopAgent(id);
    let agents: Agent[] = getAgents();
    const prevLen = agents.length;
    agents = agents.filter((agent: Agent) => agent.id !== id);
    if (agents.length === prevLen) {
      res.status(404).json({ error: 'Agent not found for deletion' });
      return;
    }
    saveAgents(agents);
    res.status(200).json({ ok: true });
  } else if (req.method === "GET") {
    // Get agent details
    const agents: Agent[] = getAgents();
    const agent = agents.find((agent: Agent) => agent.id === id);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }
    res.status(200).json({ agent });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
