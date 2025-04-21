import 'openai/shims/node';

import {
  AGENT_ID, CHAT_ID,
  setTestEnv, resetTestEnv,
  loadHandler, createTelegramUpdate,
  mockSupabaseClient, mockedAxios, isSendMessage,
} from './helpers';
import { orchestrator } from '../src/orchestration/orchestratorSingleton';
import { EventEmitter } from 'events';
import { EventEmitter } from 'events';

// Minimal BaseAgent stub for EventEmitter compatibility
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

describe('Agent control commands', () => {

  beforeAll(() => {
    // Patch orchestrator agent mocks to use EventEmitter-compatible TestAgent
    orchestrator.getSwarmState.mockReturnValue({ agents: [{ id: AGENT_ID, status: 'healthy', instance: new TestAgent(AGENT_ID) }] });
    orchestrator.getAgent = jest.fn((id: string) => (id === AGENT_ID ? { id: AGENT_ID, status: 'healthy', instance: new TestAgent(AGENT_ID) } : undefined));
    orchestrator.stopAgent = jest.fn(() => Promise.resolve());
    orchestrator.restartAgent = jest.fn(() => Promise.resolve('healthy'));
  });

  afterAll(resetTestEnv);

  beforeEach(() => {
    jest.resetAllMocks();
    setTestEnv();
    mockSupabaseClient();
  });

  const cases = [
    { cmd: '/status',               regex: /Live Agents/i,   method: null },
    { cmd: `/stop ${AGENT_ID}`,     regex: /Agent stopped/i, method: 'stopAgent'   as const },
    { cmd: `/restart ${AGENT_ID}`,  regex: /restarted/i,     method: 'restartAgent' as const },
  ];

  test.each(cases)('$cmd responds with confirmation', async ({ cmd, regex, method }) => {

    if (method) orchestrator[method].mockResolvedValue('healthy');

    const handler         = loadHandler();
    const { req, res }    = createTelegramUpdate({ id: 1, chat: { id: CHAT_ID }, text: cmd });

    mockedAxios.post.mockResolvedValue({ data: {} }); // telegram sendMessage stub

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);

    const sendMessageCall = mockedAxios.post.mock.calls.find(([url]) => isSendMessage(url));
    expect(sendMessageCall).toBeDefined();
    expect(sendMessageCall![1])
      .toEqual(expect.objectContaining({ chat_id: CHAT_ID, text: expect.stringMatching(regex) }));

    if (method) {
      expect(orchestrator[method]).toHaveBeenCalledWith(AGENT_ID);
    }
  });
});
