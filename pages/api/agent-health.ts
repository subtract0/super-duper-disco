// pages/api/agent-health.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { orchestrator } from '../../src/orchestration/orchestratorSingleton';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Return health for all agents
  const agents = orchestrator.listAgents();
  const health = agents.map(a => ({ id: a.id, status: orchestrator.getHealth(a.id) }));
  res.status(200).json({ health });
}
