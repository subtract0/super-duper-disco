process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
process.env.TELEGRAM_BOT_TOKEN = 'dummy-bot-token';
process.env.OPENAI_API_KEY = 'dummy-openai-key';
process.env.WHISPER_API_KEY = 'dummy-whisper-key';

import { createMocks } from 'node-mocks-http';

// Mock orchestratorSingleton before importing handler
jest.mock('../../src/orchestration/orchestratorSingleton', () => ({
  orchestrator: {
    getSwarmState: jest.fn(() => ({ agents: [{ id: 'test-agent', status: 'healthy' }] })),
    stopAgent: jest.fn(),
    restartAgent: jest.fn(() => Promise.resolve('healthy')),
  },
}));

describe('Telegram API Handler - agent control commands', () => {
  const chat_id = 123;
  const agentId = 'test-agent';
  let handler: any;
  beforeAll(async () => {
    handler = (await import('../../pages/api/telegram')).default;
  });
  it('handles /status command', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { message: { chat: { id: chat_id }, from: { id: 1 }, message_id: 1, text: '/status' } },
    });
    const mockSendTelegramMessage = jest.fn().mockResolvedValue(undefined);
    await handler(req, res, undefined, undefined, undefined, mockSendTelegramMessage);
    expect(res._getStatusCode()).toBe(200);
    const calls = mockSendTelegramMessage.mock.calls;
    expect(calls.length).toBe(1);
    expect(calls[0][0]).toBe(chat_id);
    expect(calls[0][1]).toMatch(/Live Agents/i);
    expect(calls[0][1]).toMatch(agentId);
  });
  it('handles /stop <id> command', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { message: { chat: { id: chat_id }, from: { id: 1 }, message_id: 2, text: `/stop ${agentId}` } },
    });
    const mockSendTelegramMessage = jest.fn().mockResolvedValue(undefined);
    await handler(req, res, undefined, undefined, undefined, mockSendTelegramMessage);
    expect(res._getStatusCode()).toBe(200);
    const calls = mockSendTelegramMessage.mock.calls;
    expect(calls.length).toBe(1);
    expect(calls[0][1]).toMatch(/Agent stopped/i);
    expect(calls[0][1]).toMatch(agentId);
  });
  it('handles /restart <id> command', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { message: { chat: { id: chat_id }, from: { id: 1 }, message_id: 3, text: `/restart ${agentId}` } },
    });
    const mockSendTelegramMessage = jest.fn().mockResolvedValue(undefined);
    await handler(req, res, undefined, undefined, undefined, mockSendTelegramMessage);
    expect(res._getStatusCode()).toBe(200);
    const calls = mockSendTelegramMessage.mock.calls;
    expect(calls.length).toBe(1);
    expect(calls[0][1]).toMatch(/restarted/i);
    expect(calls[0][1]).toMatch(agentId);
  });
});
