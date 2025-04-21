// logForwarder.test.ts
// Tests for SlackLogForwarder and AgentLogForwarder integration
import { SlackLogForwarder } from './slackLogForwarder';
import { AgentLogEntry, setAgentLogForwarder, agentLogStore } from './agentLogs';

global.fetch = jest.fn(() => Promise.resolve({ ok: true })) as any;

describe('SlackLogForwarder', () => {
  const webhookUrl = 'https://hooks.slack.com/services/test/test/test';
  let forwarder: SlackLogForwarder;
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    forwarder = new SlackLogForwarder(webhookUrl, 'warn');
    setAgentLogForwarder(forwarder);
  });

  it('should forward warn and error logs to Slack', () => {
    const warnEntry: AgentLogEntry = {
      agentId: 'test-agent',
      timestamp: Date.now(),
      level: 'warn',
      message: 'This is a warning.'
    };
    const errorEntry: AgentLogEntry = {
      agentId: 'test-agent',
      timestamp: Date.now(),
      level: 'error',
      message: 'This is an error.'
    };
    agentLogStore.addLog(warnEntry);
    agentLogStore.addLog(errorEntry);
    expect(fetch).toHaveBeenCalledTimes(2);
    const calls = (fetch as jest.Mock).mock.calls;
    expect(calls[0][0]).toBe(webhookUrl);
    expect(calls[1][0]).toBe(webhookUrl);
    expect(JSON.parse(calls[0][1].body).text.toUpperCase()).toContain('WARN');
    expect(JSON.parse(calls[1][1].body).text.toUpperCase()).toContain('ERROR');
  });

  it('should not forward info logs to Slack', () => {
    const infoEntry: AgentLogEntry = {
      agentId: 'test-agent',
      timestamp: Date.now(),
      level: 'info',
      message: 'This is info.'
    };
    agentLogStore.addLog(infoEntry);
    expect(fetch).not.toHaveBeenCalled();
  });
});
