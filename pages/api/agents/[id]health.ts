import type { NextApiRequest, NextApiResponse } from "next";
import { AgentOrchestrator } from '../../../src/orchestration/agentOrchestrator';

// Use a singleton orchestrator instance
const agentOrchestrator = new AgentOrchestrator();

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    res.status(400).json({ error: 'Invalid agent id (must be string)' });
    return;
  }
  if (req.method === "GET") {
    const status = agentOrchestrator.getHealth(id);
    res.status(200).json({ status });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
