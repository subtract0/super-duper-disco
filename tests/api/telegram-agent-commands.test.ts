import { createMocks } from 'node-mocks-http';
import { EventEmitter } from 'events';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
process.env.TELEGRAM_BOT_TOKEN = 'dummy-bot-token';
process.env.OPENAI_API_KEY = 'dummy-openai-key';
process.env.WHISPER_API_KEY = 'dummy-whisper-key';

class TestAgent extends EventEmitter {
  id: string;
  status: string = 'running';
  constructor(id: string) {
    super();
    this.id = id;
  }
  stop() { this.status = 'stopped'; }
  start() { this.status = 'running'; }
}

// Mock orchestratorSingleton before importing handler
jest.mock('../../src/orchestration/orchestratorSingleton', () => ({
  orchestrator: {
    getSwarmState: jest.fn(() => ({ agents: [{ id: 's1', status: 'healthy', instance: new TestAgent('s1') }] })),
    stopAgent: jest.fn(() => Promise.resolve()),
    restartAgent: jest.fn(() => Promise.resolve('healthy')),
    getAgent: jest.fn((id) => (id === 's1' ? { id: 's1', status: 'healthy', instance: new TestAgent('s1') } : undefined)),
    listAgents: jest.fn(() => [{ id: 's1', status: 'healthy', instance: new TestAgent('s1') }]),
  },
}));

// --- Agent Control Commands Test Suite ---
describe('Telegram API Handler - agent control commands', () => {
  const chat_id = 123;
  const agentId = 's1';
  let handler: any;
  beforeAll(async () => {
    handler = (await import('../../pages/api/telegram')).default;
  });
  beforeEach(() => {
    jest.clearAllMocks();
    require('axios').post = jest.fn().mockResolvedValue({ data: {} });
  });
  it('handles /status command', async () => {
  try {
    const { req, res } = createMocks({
      method: 'POST',
      body: { message: { chat: { id: chat_id }, from: { id: 1 }, message_id: 1, text: '/status' } },
    });
    const mockSendTelegramMessage = jest.fn().mockResolvedValue(undefined);
    await handler(req, res, undefined, mockSendTelegramMessage);
    expect(res._getStatusCode()).toBe(200);
    const calls = mockSendTelegramMessage.mock.calls;
    expect(calls.length).toBe(1);
    expect(calls[0][0]).toBe(chat_id);
    expect(calls[0][1]).toMatch(/Live Agents:\ns1: running/);
  } catch (err) {
    console.error('[TEST ERROR][agent-control:/status]', err);
    throw err;
  }
});
  it('handles /stop <id> command', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { message: { chat: { id: chat_id }, from: { id: 1 }, message_id: 2, text: `/stop ${agentId}` } },
    });
    const mockSendTelegramMessage = jest.fn().mockResolvedValue(undefined);
    await handler(req, res, undefined, mockSendTelegramMessage);
    expect(res._getStatusCode()).toBe(200);
    const calls = mockSendTelegramMessage.mock.calls;
    expect(calls.length).toBe(1);
    expect(calls[0][1]).toMatch(/Agent stopped: s1/);
  });
  it('handles /restart <id> command', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { message: { chat: { id: chat_id }, from: { id: 1 }, message_id: 3, text: `/restart ${agentId}` } },
    });
    const mockSendTelegramMessage = jest.fn().mockResolvedValue(undefined);
    await handler(req, res, undefined, mockSendTelegramMessage);
    expect(res._getStatusCode()).toBe(200);
    const calls = mockSendTelegramMessage.mock.calls;
    expect(calls.length).toBe(1);
    expect(calls[0][1]).toMatch(/restarted/i);
    expect(calls[0][1]).toMatch(agentId);
  });
});

// --- Conversational and Fallback Flows Test Suite ---
describe('Telegram API Handler - conversational and fallback flows', () => {
  const chat_id = 123;
  let handler: any;
  beforeAll(async () => {
    handler = (await import('../../pages/api/telegram')).default;
  });
  beforeEach(() => {
    
    jest.clearAllMocks();
    require('axios').post = jest.fn().mockResolvedValue({ data: {} });
  });

  it('responds with fallback/help for ambiguous input', async () => {
    const ambiguousInputs = ['Hi', 'Ho', 'asdf', 'hello', 'whatup'];
    for (const text of ambiguousInputs) {
      const { req, res } = createMocks({
        method: 'POST',
        body: { message: { chat: { id: chat_id }, from: { id: 1 }, message_id: 10, text } },
      });
      const mockSendTelegramMessage = jest.fn().mockResolvedValue(undefined);
      await handler(req, res, undefined, mockSendTelegramMessage);
      expect(res._getStatusCode()).toBe(200);
      const calls = mockSendTelegramMessage.mock.calls;
      expect(calls.length).toBe(1);
      expect(calls[0][1]).toMatch(/Live Agents:|Sorry, I couldn't understand|try \/help/i);
    }
  });

  it('responds with error/help for unknown agent', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { message: { chat: { id: chat_id }, from: { id: 1 }, message_id: 11, text: '/stop unknown-agent' } },
    });
    const mockSendTelegramMessage = jest.fn().mockResolvedValue(undefined);
    await handler(req, res, undefined, mockSendTelegramMessage);
    expect(res._getStatusCode()).toBe(200);
    const calls = mockSendTelegramMessage.mock.calls;
    expect(calls.length).toBe(1);
    expect(calls[0][1]).toMatch(/not found|couldn't find|unknown agent|try \/help/i);
  });

  it('responds with clarification/help for malformed config update', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { message: { chat: { id: chat_id }, from: { id: 1 }, message_id: 12, text: 'update config for agent X to not-json' } },
    });
    const mockSendTelegramMessage = jest.fn().mockResolvedValue(undefined);
    await handler(req, res, undefined, mockSendTelegramMessage);
    expect(res._getStatusCode()).toBe(200);
    const calls = mockSendTelegramMessage.mock.calls;
    expect(calls.length).toBe(1);
    expect(calls[0][1]).toMatch(/Please send the new config as JSON|Invalid JSON|couldn't understand|try \/help|clarify/i);
  });

  it('responds with clarification prompt for multi-turn/ambiguous agent action', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { message: { chat: { id: chat_id }, from: { id: 1 }, message_id: 13, text: 'stop my agent' } },
    });
    const mockSendTelegramMessage = jest.fn().mockResolvedValue(undefined);
    await handler(req, res, undefined, mockSendTelegramMessage);
    expect(res._getStatusCode()).toBe(200);
    const calls = mockSendTelegramMessage.mock.calls;
    expect(calls.length).toBe(1);
    expect(calls[0][1]).toMatch(/Invalid JSON: Please provide the config as valid JSON|which agent|specify|clarify|try \/help/i);
  });
});

// --- Sanity Test ---
describe('Sanity', () => {
  it('should run a basic test', () => {
    expect(true).toBe(true);
  });
});


