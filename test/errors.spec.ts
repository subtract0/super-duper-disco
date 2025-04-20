import {
  CHAT_ID,
  setTestEnv, resetTestEnv,
  loadHandler, createTelegramUpdate,
  mockSupabaseClient, mockOpenAI,
  mockedAxios, isSendMessage,
  makeHistoryAndInsertMocks,
} from './helpers';

beforeAll(setTestEnv);
afterAll(resetTestEnv);

beforeEach(() => {
  jest.resetAllMocks();
  setTestEnv();
});

/* ── Supabase insert failure ─────────────────────────────── */
test('informs user when Supabase insert fails', async () => {
  mockSupabaseClient({ insertErr: new Error('Supabase down') });

  const { insertMessage } = makeHistoryAndInsertMocks();
  insertMessage.mockResolvedValue({ error: { message: 'Supabase down' } });

  mockedAxios.post.mockResolvedValue({ data: {} });       // telegram sendMessage

  const handler      = loadHandler();
  const { req, res } = createTelegramUpdate({ id: 4, chat: { id: CHAT_ID }, text: 'trigger' });

  await handler(req, res, undefined, undefined, insertMessage);

  expect(res._getStatusCode()).toBe(200);
  const body = JSON.parse(res._getData());
  expect(body.ok).toBe(false);

  const call = mockedAxios.post.mock.calls.find(([url]) => isSendMessage(url));
  expect(call![1]).toEqual(
    expect.objectContaining({ chat_id: CHAT_ID, text: expect.stringMatching(/Supabase down/i) }),
  );
});

/* ── OpenAI failure ──────────────────────────────────────── */
test('informs user when OpenAI fails', async () => {
  mockSupabaseClient();
  mockOpenAI(new Error('OpenAI down'));

  mockedAxios.post.mockResolvedValue({ data: {} });       // telegram sendMessage

  const handler      = loadHandler();
  const { req, res } = createTelegramUpdate({ id: 5, chat: { id: CHAT_ID }, text: 'oops' });

  await handler(req, res);

  expect(res._getStatusCode()).toBe(200);
  const body = JSON.parse(res._getData());
  expect(body.error).toMatch(/OpenAI down/i);

  const call = mockedAxios.post.mock.calls.find(([url]) => isSendMessage(url));
  expect(call![1]).toEqual(
    expect.objectContaining({ chat_id: CHAT_ID, text: expect.stringMatching(/OpenAI down/i) }),
  );
});
