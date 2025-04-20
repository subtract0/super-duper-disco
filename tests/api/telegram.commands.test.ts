process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
process.env.TELEGRAM_BOT_TOKEN = 'dummy-bot-token';
process.env.OPENAI_API_KEY = 'dummy-openai-key';
import { createMocks } from 'node-mocks-http';

// Mock orchestratorSingleton before importing handler (for Jest/Next.js transform compatibility)
// In-memory agent list for orchestrator mock
let agents: any[] = [];

jest.mock('../../src/orchestration/orchestratorSingleton', () => ({
  orchestrator: {
    getSwarmState: jest.fn(() => ({ agents })),
    stopAgent: jest.fn(async (id: string) => {
      const idx = agents.findIndex(a => a.id === id);
      if (idx === -1) throw new Error('Agent not found');
      agents.splice(idx, 1);
      return true;
    }),
    restartAgent: jest.fn(async (id: string) => {
      const agent = agents.find(a => a.id === id);
      if (!agent) throw new Error('Agent not found');
      agent.status = 'running';
      return 'running';
    }),
    launchAgent: jest.fn(async (agentConfig: any) => {
      agents.push({ ...agentConfig, status: 'running' });
      return { ...agentConfig, status: 'running' };
    }),
    updateAgentConfig: jest.fn(async (id: string, config: any) => {
      const agent = agents.find(a => a.id === id);
      if (!agent) throw new Error('Agent not found');
      agent.config = config;
      return true;
    }),
    reset: jest.fn(() => { agents = []; }),
  },
}));
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

  it('prompts for missing agent id in natural language stop request', async () => {
    (axios.post as jest.Mock).mockResolvedValue({ data: {} });
    // Ensure orchestrator has no agents for this test
    orchestrator.reset();
    const { req, res } = createMocks({
      method: 'POST',
      body: { message: { chat: { id: 15 }, from: { id: 25 }, message_id: 40, text: 'please stop my agent' } },
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const calls = (axios.post as jest.Mock).mock.calls;
    const sendCall = calls.find(c => c[0].includes('/sendMessage'));
    expect(sendCall).toBeDefined();
    const [, payload] = sendCall!;
    expect(payload.chat_id).toBe(15);
    expect(payload.text).toMatch(/which agent/i);
  });

  it('prompts for config JSON in update-config request', async () => {
    (axios.post as jest.Mock).mockResolvedValue({ data: {} });
    // Launch agent so handler recognizes the ID
    await orchestrator.launchAgent({ id: 'x1', type: 'native', status: 'pending', host: 'test', config: {} });
    const { req, res } = createMocks({
      method: 'POST',
      body: { message: { chat: { id: 16 }, from: { id: 26 }, message_id: 41, text: 'update config for agent x1' } },
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const calls = (axios.post as jest.Mock).mock.calls;
    const sendCall = calls.find(c => c[0].includes('/sendMessage'));
    expect(sendCall).toBeDefined();
    const [, payload] = sendCall!;
    expect(payload.chat_id).toBe(16);
    expect(payload.text).toMatch(/send the new config/i);
  });

  it('confirms config update on valid config', async () => {
    (axios.post as jest.Mock).mockResolvedValue({ data: {} });
    // Launch agent so handler recognizes the ID
    await orchestrator.launchAgent({ id: 'y1', type: 'native', status: 'pending', host: 'test', config: {} });
    // First message triggers prompt for config
    let { req, res } = createMocks({
      method: 'POST',
      body: { message: { chat: { id: 17 }, from: { id: 27 }, message_id: 42, text: 'update config for agent y1' } },
    });
    await handler(req, res);
    // Second message provides config JSON
    req = createMocks({
      method: 'POST',
      body: { message: { chat: { id: 17 }, from: { id: 27 }, message_id: 43, text: '{ "foo": "bar" }' } },
    }).req;
    res = createMocks({ method: 'POST' }).res;
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const calls = (axios.post as jest.Mock).mock.calls;
    const sendCall = calls.reverse().find(c => c[0].includes('/sendMessage'));
    expect(sendCall).toBeDefined();
    const [, payload] = sendCall!;
    expect(payload.chat_id).toBe(17);
    expect(payload.text).toMatch(/config updated/i);
  });

  it('notifies user if config update fails', async () => {
    // Launch agent so handler recognizes the ID
    await orchestrator.launchAgent({ id: 'z1', type: 'native', status: 'pending', host: 'test', config: {} });
    // Patch updateAgentConfig to return false only for z1+fail
    jest.spyOn(orchestrator, 'updateAgentConfig').mockImplementation(async (id: string, config: any) => {
      if (id === 'z1' && config.foo === 'fail') return false;
      return true;
    });
    (axios.post as jest.Mock).mockResolvedValue({ data: {} });
    // First message triggers prompt for config
    let { req, res } = createMocks({
      method: 'POST',
      body: { message: { chat: { id: 18 }, from: { id: 28 }, message_id: 44, text: 'update config for agent z1' } },
    });
    await handler(req, res);
    // Second message provides config JSON
    req = createMocks({
      method: 'POST',
      body: { message: { chat: { id: 18 }, from: { id: 28 }, message_id: 45, text: '{ "foo": "fail" }' } },
    }).req;
    res = createMocks({ method: 'POST' }).res;
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const calls = (axios.post as jest.Mock).mock.calls;
    const sendCall = calls.reverse().find(c => c[0].includes('/sendMessage'));
    expect(sendCall).toBeDefined();
    const [, payload] = sendCall!;
    expect(payload.chat_id).toBe(18);
    expect(payload.text).toMatch(/failed to update config/i);
  });

  it('notifies user if config JSON is malformed', async () => {
    (axios.post as jest.Mock).mockResolvedValue({ data: {} });
    // Launch agent so handler recognizes the ID
    await orchestrator.launchAgent({ id: 'badjson', type: 'native', status: 'pending', host: 'test', config: {} });
    // Prompt for config
    let { req, res } = createMocks({
      method: 'POST',
      body: { message: { chat: { id: 19 }, from: { id: 29 }, message_id: 46, text: 'update config for agent badjson' } },
    });
    await handler(req, res);
    // User sends malformed JSON
    req = createMocks({
      method: 'POST',
      body: { message: { chat: { id: 19 }, from: { id: 29 }, message_id: 47, text: '{ foo: bar' } },
    }).req;
    res = createMocks({ method: 'POST' }).res;
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const calls = (axios.post as jest.Mock).mock.calls;
    const sendCall = calls.reverse().find(c => c[0].includes('/sendMessage'));
    expect(sendCall).toBeDefined();
    const [, payload] = sendCall!;
    expect(payload.chat_id).toBe(19);
    expect(payload.text).toMatch(/invalid json|parse error|could not parse/i);
  });

  it('notifies user if agent id does not exist for stop command', async () => {
    jest.spyOn(orchestrator, 'stopAgent').mockImplementation(async (id: string) => {
      throw new Error('Agent not found');
    });
    (axios.post as jest.Mock).mockResolvedValue({ data: {} });
    const { req, res } = createMocks({
      method: 'POST',
      body: { message: { chat: { id: 20 }, from: { id: 30 }, message_id: 48, text: '/stop nonexist' } },
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const calls = (axios.post as jest.Mock).mock.calls;
    const sendCall = calls.reverse().find(c => c[0].includes('/sendMessage'));
    expect(sendCall).toBeDefined();
    const [, payload] = sendCall!;
    expect(payload.chat_id).toBe(20);
    expect(payload.text).toMatch(/not found|no agent/i);
  });

  it('handles rapid repeated stop commands gracefully', async () => {
    await orchestrator.launchAgent({ id: 'repeat1', type: 'native', status: 'pending', host: 'test', config: {} });
    (axios.post as jest.Mock).mockResolvedValue({ data: {} });
    // First stop
    let { req, res } = createMocks({
      method: 'POST',
      body: { message: { chat: { id: 21 }, from: { id: 31 }, message_id: 49, text: '/stop repeat1' } },
    });
    await handler(req, res);
    // Immediately try to stop again
    req = createMocks({
      method: 'POST',
      body: { message: { chat: { id: 21 }, from: { id: 31 }, message_id: 50, text: '/stop repeat1' } },
    }).req;
    res = createMocks({ method: 'POST' }).res;
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const calls = (axios.post as jest.Mock).mock.calls;
    // Should notify user that agent is already stopped or not found
    const sendCall = calls.reverse().find(c => c[0].includes('/sendMessage'));
    expect(sendCall).toBeDefined();
    const [, payload] = sendCall!;
    expect(payload.chat_id).toBe(21);
    expect(payload.text).toMatch(/already stopped|not found|no agent/i);
  });
});
