import { AgentOrchestrator } from '@/orchestration';
import { Intent } from './types';

export class Controller {
  constructor(private readonly orch: AgentOrchestrator) {}

  async exec(intent: Intent): Promise<string> {
    try {
      switch (intent.kind) {
        case 'status': {
          const s = this.orch.listAgents().map(a => `${a.id}: ${a.status}`).join('\n');
          return `Live Agents:\n${s}`;
        }
        case 'stop':
          await this.orch.stopAgent(intent.agentId!);
          return `Agent stopped: ${intent.agentId}`;
        case 'restart':
          await this.orch.restartAgent(intent.agentId!);
          return `Agent restarted: ${intent.agentId}`;
        case 'launch':
          await this.orch.launchAgent({ id: intent.agentId!, type: intent.launchType || 'native', status: 'pending', host: '', config: {} });
          return `Agent launched: ${intent.agentId}`;
        case 'delete':
          await this.orch.stopAgent(intent.agentId!);
          return `Agent deleted: ${intent.agentId}`;
        case 'update-config':
          await this.orch.updateAgentConfig(intent.agentId!, intent.config!);
          return `Agent config updated: ${intent.agentId}`;
        case 'help':
          return 'Available commands:\n/status — show live agents\n/stop <id>\n/restart <id>\n/launch <id> [as <type>]\n/delete <id>\n/update config for agent <id> to {...}\n/help — show this help message';
        default:
          return 'Unknown command or intent.';
      }
    } catch (err: any) {
      return `Error: ${err?.message || 'Unknown error'}`;
    }
  }
}
