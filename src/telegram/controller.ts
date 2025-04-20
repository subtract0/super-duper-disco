import { AgentOrchestrator } from '@/orchestration';
import { Intent } from './types';

export class Controller {
  constructor(private readonly orch: AgentOrchestrator) {}

  async exec(intent: Intent): Promise<string> {
    switch (intent.kind) {
      case 'status': {
        const s = this.orch.list().map(a => `${a.id}: ${a.status}`).join('\n');
        return `Live agents:\n${s}`;
      }
      case 'stop':
        await this.orch.stop(intent.agentId!);   return `stopped ${intent.agentId}`;
      case 'restart':
        await this.orch.restart(intent.agentId!);return `restart triggered`;
      case 'launch':
        await this.orch.launch({ id: intent.agentId!, type: intent.launchType || 'native', status: 'pending', host: '', config: {} });
        return `launched ${intent.agentId}`;
      case 'delete':
        await this.orch.stop(intent.agentId!);   return `deleted ${intent.agentId}`;
      case 'update-config':
        await this.orch.updateAgentConfig(intent.agentId!, intent.config!);
        return `config updated`;
      default: return 'unknown';
    }
  }
}
