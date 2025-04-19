import { createMocks } from 'node-mocks-http';
import handler from '../../pages/api/telegram';
import { orchestrator } from '../../src/orchestration/orchestratorSingleton';
import axios from 'axios';

jest.mock('axios');

describe('Telegram bot agent commands', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    orchestrator.reset();
  });

  it('/status returns running agents list', async () => {
    // Launch two agents
    await orchestrator.launchAgent({ id: 's1', type: 'native', status: 'pending', host: 'test', config: {} });
    await orchestrator.launchAgent({ id: 's2', type: 'native', status: 'pending', host: 'test', config: {} });
    (axios.post as jest.Mock).mockResolvedValue({ data: {} });
    const { req, res } = createMocks({
      method: 'POST',
      body: { message: { chat: { id: 10 }, from: { id: 20 }, message_id: 30, text: '/status' } },
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const resp = JSON.parse(res._getData());
    expect(resp.ok).toBe(true);
    const calls = (axios.post as jest.Mock).mock.calls;
    // Last sendMessage call
    const sendCall = calls.find(c => c[0].includes('/sendMessage'));
    expect(sendCall).toBeDefined();
    const [, payload] = sendCall!;
    expect(payload.chat_id).toBe(10);
    expect(payload.text).toMatch(/s1: running/);
    expect(payload.text).toMatch(/s2: running/);
  });

  it('/stop stops the specified agent', async () => {
    // Launch one agent
    await orchestrator.launchAgent({ id: 'stop1', type: 'native', status: 'pending', host: 'test', config: {} });
    (axios.post as jest.Mock).mockResolvedValue({ data: {} });
    const { req, res } = createMocks({
      method: 'POST',
      body: { message: { chat: { id: 11 }, from: { id: 21 }, message_id: 31, text: '/stop stop1' } },
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const resp = JSON.parse(res._getData());
    expect(resp.ok).toBe(true);
    const sendCall = (axios.post as jest.Mock).mock.calls.find(c => c[0].includes('/sendMessage'));
    expect(sendCall).toBeDefined();
    const [, payload] = sendCall!;
    expect(payload.text).toContain('✅ Agent stopped: stop1');
  });

  it('/restart restarts the specified agent', async () => {
    // Launch and stop the agent first
    await orchestrator.launchAgent({ id: 'r1', type: 'native', status: 'pending', host: 'test', config: {} });
    await orchestrator.stopAgent('r1');
    (axios.post as jest.Mock).mockResolvedValue({ data: {} });
    const { req, res } = createMocks({
      method: 'POST',
      body: { message: { chat: { id: 12 }, from: { id: 22 }, message_id: 32, text: '/restart r1' } },
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const resp = JSON.parse(res._getData());
    expect(resp.ok).toBe(true);
    const sendCall = (axios.post as jest.Mock).mock.calls.find(c => c[0].includes('/sendMessage'));
    expect(sendCall).toBeDefined();
    const [, payload] = sendCall!;
    expect(payload.text).toMatch(/✅ Agent r1 restarted: \w+/);
  });
});
