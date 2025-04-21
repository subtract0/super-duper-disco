// pages/api/agent-health.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { orchestrator } from '../../src/orchestration/orchestratorSingleton';
import { agentHistoryStore } from '../../src/orchestration/agentHistory';
import { agentHealthStore } from '../../src/orchestration/agentHealth';
import { agentManager } from '../../src/orchestration/agentManagerSingleton';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Return health for all agents, including uptime, crashCount, lastHeartbeat
  const agents = orchestrator.listAgents();
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const health = [];
  for (const agent of agents) {
    // Analytics: calculate uptimePercent, MTTR, downtime (last 24h)
    const deployments = (await agentHistoryStore.getDeploymentsByAgent(agent.id)).filter(
      d => now - d.timestamp < ONE_DAY
    );
    // Assume each deployment is a recovery from crash or downtime
    let mttr = null;
    let downtime = 0;
    let uptimePercent = null;
    if (deployments.length > 1) {
      // MTTR: mean time between crash and recovery events
      const intervals = [];
      for (let i = 1; i < deployments.length; ++i) {
        intervals.push(deployments[i].timestamp - deployments[i - 1].timestamp);
      }
      mttr = intervals.length ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length) : null;
    }
    // Uptime percent: (total time - downtime) / total time
    // For demo: if agent is running, all time is uptime except for known downtime intervals
    // Downtime: count time between crash and next deployment
    // (This is a simplification; for real prod, use persistent events)
    let lastDown = null;
    let totalDowntime = 0;
    for (const d of deployments) {
      if (d.config && d.config.status === 'crashed') {
        lastDown = d.timestamp;
      } else if (lastDown) {
        totalDowntime += d.timestamp - lastDown;
        lastDown = null;
      }
    }
    downtime = totalDowntime;
    uptimePercent = 1 - downtime / ONE_DAY;
    if (uptimePercent < 0) uptimePercent = 0;
    if (uptimePercent > 1) uptimePercent = 1;
    health.push({
      id: agent.id,
      status: agentHealthStore.getHealth(agent.id),
      uptime: agent.instance && agent.instance.status === 'running' && agent.instance.lastHeartbeat ? now - agent.instance.lastHeartbeat : 0,
      crashCount: typeof agent.crashCount === 'number' ? agent.crashCount : 0,
      lastHeartbeat: agent.instance && agent.instance.lastHeartbeat ? agent.instance.lastHeartbeat : null,
      uptimePercent,
      mttr,
      downtime
    });
  }
  res.status(200).json({ health });
}
