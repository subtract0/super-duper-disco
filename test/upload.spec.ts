import 'openai/shims/node';
import {
  CHAT_ID,
  setTestEnv, resetTestEnv,
  loadHandler, createTelegramUpdate,
  mockSupabaseClient, mockOpenAI,
  mockedAxios,
} from './helpers';

beforeAll(setTestEnv);
afterAll(resetTestEnv);

beforeEach(() => {
  jest.resetAllMocks();
  setTestEnv();
  mockSupabaseClient();
});

test('document upload → stored & acked', async () => {
  /* 1st axios.get → telegram filePath ; 2nd → real file buffer */
  mockedAxios.get
    .mockResolvedValueOnce({ data: { result: { file_path: 'docs/mockfile.pdf' } } })
    .mockResolvedValueOnce({
      data   : Buffer.from('pdf-content'),
      headers: { 'content-type': 'application/pdf', 'content-length': '12' },
    });

  mockOpenAI('File received!');

  const handler      = loadHandler();
  const { req, res } = createTelegramUpdate({
    id: 3,
    chat    : { id: CHAT_ID },
    document: { file_id: 'abc', file_name: 'doc.pdf' },
  });

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
  const body = JSON.parse(res._getData());
  expect(body.ok).toBe(true);
  expect(body.file_url).toContain('mock.png');
});
