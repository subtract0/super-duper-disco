import type { NextApiRequest, NextApiResponse } from "next";

import { getAgents, saveAgents } from '../../../__mocks__/persistentStore';
import { v4 as uuidv4 } from 'uuid';
import { orchestrator } from '../../../src/orchestration/orchestratorSingleton';
import { agentManager } from '../../../src/orchestration/agentManagerSingleton';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    // List all agents from orchestrator (live state), robustly
    try {
      const agents = orchestrator.listAgents();
      const detailedAgents = agents.map(agent => {
        let health: string = 'unknown';
        let error: string | undefined = undefined;
        let logs: string[] = [];
        let lastHeartbeat: number | null = null;
        let lastActivity: number | null = null;
        try {
          health = orchestrator.getHealth(agent.id);
          logs = agentManager.getAgentLogs(agent.id);
          lastHeartbeat = agentManager.getAgentLastHeartbeat(agent.id);
          lastActivity = agentManager.getAgentLastActivity(agent.id);
        } catch (e: any) {
          error = 'Failed to fetch health/logs: ' + (e?.message || e);
        }
        return { ...agent, health, logs, lastHeartbeat, lastActivity, ...(error ? { error } : {}) };
      });
      res.status(200).json({ agents: detailedAgents });
    } catch (e: any) {
      res.status(500).json({ error: 'Failed to list agents', detail: e?.message || e });
    }
  } else if (req.method === "POST") {
    // Deploy a new agent via orchestrator
    const newAgent = {
      id: uuidv4(),
      type: req.body.type,
      status: 'pending' as const,
      host: req.body.host,
      config: req.body.config || {},
    };
    const launched = await orchestrator.launchAgent(newAgent);
    res.status(201).json({ ok: true, agent: launched });
  } else {
    res.status(405).end();
  }
}
