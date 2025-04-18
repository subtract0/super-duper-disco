// pages/api/orchestrator-state.ts
import { orchestrator } from '../../src/orchestration/orchestratorSingleton';
import { agentLogStore } from '../../src/orchestration/agentLogs';

export default function handler(req: any, res: any) {
  // Fetch live orchestrator state
  const agents = orchestrator.listAgents();
  const health: Record<string, any> = {};
  agents.forEach(agent => {
    health[agent.id] = {
      status: agent.status,
      lastHeartbeat: agent.lastHeartbeat,
      lastActivity: agent.lastActivity
    };
  });
  // Get recent logs (up to 50)
  let logs: any[] = [];
  if (typeof (agentLogStore as any).logs !== 'undefined') {
    logs = (agentLogStore as any).logs;
  } else if (typeof (agentLogStore as any).getAllLogs === 'function') {
    logs = (agentLogStore as any).getAllLogs();
  }
  logs = logs.sort((a: any, b: any) => b.timestamp - a.timestamp).slice(0, 50);
  res.status(200).json({
    state: 'live',
    health,
    logs
  });
}
