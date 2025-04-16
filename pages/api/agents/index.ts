import type { NextApiRequest, NextApiResponse } from "next";

import { getAgents, saveAgents } from '../../../__mocks__/persistentStore';
import { v4 as uuidv4 } from 'uuid';
import { AgentOrchestrator } from '../../../src/orchestration/agentOrchestrator';

// Singleton orchestrator instance (will be used for all agent ops)
export const orchestrator = new AgentOrchestrator();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    // List all agents from persistent store
    const agents = getAgents();
    res.status(200).json({ agents });
  } else if (req.method === "POST") {
    // Add (deploy) a new agent to persistent store
    const agents = getAgents();
    let newAgent: any = {
      id: uuidv4(),
      type: req.body.type,
      status: 'pending',
      host: req.body.host,
      config: req.body.config || {},
    };
    // Simulate orchestration/launch
    await orchestrator.launchAgent({ ...newAgent, status: 'pending' });
    newAgent = { ...newAgent, status: 'healthy' };
    agents.push(newAgent);
    saveAgents(agents);
    res.status(201).json({ ok: true, agent: newAgent });
  } else {
    res.status(405).end();
  }
}
