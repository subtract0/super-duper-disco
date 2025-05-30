import 'openai/shims/node';
import {
  CHAT_ID,
  setTestEnv, resetTestEnv,
  loadHandler, createTelegramUpdate,
  mockSupabaseClient, mockOpenAI, mockedAxios,
  makeHistoryAndInsertMocks, isSendMessage,
} from './helpers';

beforeAll(setTestEnv);
afterAll(resetTestEnv);

beforeEach(() => {
  jest.resetAllMocks();
  setTestEnv();
  mockSupabaseClient();
});

test('text message → stores, calls OpenAI, replies', async () => {
  mockOpenAI('Hi there!');
  const { fetchMessageHistory, insertMessage } = makeHistoryAndInsertMocks();

  const handler = loadHandler();
  const { req, res } = createTelegramUpdate({ id: 2, chat: { id: CHAT_ID }, text: 'Hello' });

  let err;
  try {
    console.log('Calling handler with req:', req.body);
    await handler(req, res);
    console.log('Handler call complete');
  } catch (e) {
    err = e;
    console.error('Handler threw:', e);
  }

  expect(res._getStatusCode()).toBe(200);
  expect(insertMessage).toHaveBeenCalled();
  expect(mockedAxios.post).toHaveBeenCalled();              // OpenAI

  const call = mockedAxios.post.mock.calls.find(([url]) => isSendMessage(url));
  expect(call![1])
    .toEqual(expect.objectContaining({ chat_id: CHAT_ID, text: 'Hi there!' }));
});
