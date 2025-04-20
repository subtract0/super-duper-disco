import { AgentHealth } from '../orchestration/orchestrator/types';

export function getHealthDisplay(health: AgentHealth) {
  const status = health.status;
  const anomaly = '';
  let color = '';
  if (status === 'crashed') {
    color = '#ffeaea';
    anomaly = 'Crashed';
  } else if (status === 'stopped') {
    color = '#fffbe6';
    anomaly = 'Stopped';
  } else if (status === 'running') {
    if (health.lastHeartbeat && Date.now() - health.lastHeartbeat > 2 * 60 * 1000) {
      color = '#e0e0e0';
      anomaly = 'No heartbeat >2min';
    } else {
      color = '#eaffea';
    }
  } else {
    color = '#e0e0e0';
    anomaly = 'Unknown';
  }
  // Highlight high crash count or low uptime
  const crashStyle = (health.crashCount !== undefined && health.crashCount > 2) ? { color: '#b00', fontWeight: 600 } as const : {} as const;
  const uptimeStyle = (health.uptime !== undefined && health.uptime < 60000) ? { color: '#b00', fontWeight: 600 } as const : {} as const;
  return { status, anomaly, color, crashStyle, uptimeStyle };
}
