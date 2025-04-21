// slackLogForwarder.ts
// Simple AgentLogForwarder implementation for Slack webhook integration
import { AgentLogEntry, AgentLogForwarder } from './agentLogs';

export class SlackLogForwarder implements AgentLogForwarder {
  private webhookUrl: string;
  private minLevel: 'info' | 'warn' | 'error';

  constructor(webhookUrl: string, minLevel: 'info' | 'warn' | 'error' = 'warn') {
    this.webhookUrl = webhookUrl;
    this.minLevel = minLevel;
  }

  forwardLog(entry: AgentLogEntry): void {
    if (this.levelPriority(entry.level) < this.levelPriority(this.minLevel)) return;
    // Only send for warn/error/critical
    fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `[${entry.level.toUpperCase()}][${entry.agentId}] ${new Date(entry.timestamp).toLocaleString()}: ${entry.message}`
      })
    }).catch(() => {/* Swallow errors to avoid log spam */});
  }

  private levelPriority(level: 'info' | 'warn' | 'error'): number {
    switch (level) {
      case 'error': return 2;
      case 'warn': return 1;
      default: return 0;
    }
  }
}

// Helper to initialize from env var
export function setupSlackLogForwarderFromEnv() {
  if (typeof process === 'undefined' || !process.env.SLACK_WEBHOOK_URL) return;
  const { setAgentLogForwarder } = require('./agentLogs');
  setAgentLogForwarder(new SlackLogForwarder(process.env.SLACK_WEBHOOK_URL));
}
