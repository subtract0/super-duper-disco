process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
process.env.TELEGRAM_BOT_TOKEN = 'dummy-bot-token';
process.env.OPENAI_API_KEY = 'dummy-openai-key';
process.env.WHISPER_API_KEY = 'dummy-whisper-key';

import { createMocks } from 'node-mocks-http';
import * as supabase from '@supabase/supabase-js';
import axios from 'axios';

jest.mock('@supabase/supabase-js');

import handler from '../../pages/api/telegram';
(handler as any).supabase = {
  from: () => ({
    insert: () => Promise.resolve({ error: null }),
    select: () => ({ eq: () => ({ order: () => ({ limit: () => ({ data: [], error: null }) }) }) })
  }),
  storage: { from: () => ({ upload: () => Promise.resolve({ data: { path: 'mock.png' }, error: null }) }) },
};

jest.mock('axios');

// Helper to mock OpenAI response
const mockOpenAIResponse = (reply: string) => {
  (axios.post as jest.Mock).mockImplementationOnce(() =>
    Promise.resolve({ data: { choices: [{ message: { content: reply } }] } })
  );
};

// Helper to mock Supabase insert/select
const mockSupabaseInsert = () => {
  (supabase.createClient as jest.Mock).mockReturnValue({
    from: () => ({
      insert: () => Promise.resolve({ error: null }),
      select: () => ({ eq: () => ({ order: () => ({ limit: () => ({ data: [], error: null }) }) }) })
    }),
    storage: { from: () => ({ upload: () => Promise.resolve({ data: { path: 'mock.png' }, error: null }) }) },
  });
};

describe('Telegram API Handler', () => {
  // Skipping tests that only verify mocks or do not provide integration value
  // test.skip('mock-only or redundant test', () => {});

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseInsert();
  });

  it('handles a text message and replies', async () => {
    mockOpenAIResponse('Hello!');
    const { req, res } = createMocks({
      method: 'POST',
      body: { message: { chat: { id: 1 }, from: { id: 2 }, message_id: 3, text: 'Hi' } },
    });
    await handler(req, res, (handler as any).supabase);
    expect(res._getStatusCode()).toBe(200);
    const response = JSON.parse(res._getData());
    console.log('Full response:', response);
    if (!response.ok) {
      throw new Error('Test failure response: ' + (response.error || JSON.stringify(response)));
    }
    expect(response).toMatchObject({ ok: true });
  });

  it('handles a document (file) upload and stores URL', async () => {
    // Mock file download from Telegram (axios.get for file path)
    (axios.get as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({ data: { result: { file_path: 'docs/mockfile.pdf' } } })
    );
    // Mock actual file download (axios.get for file buffer)
    (axios.get as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({ data: Buffer.from('filecontent'), headers: { 'content-type': 'application/pdf', 'content-length': '12' } })
    );
    // Mock OpenAI response (not used, but keeps test structure consistent)
    mockOpenAIResponse('File received!');

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        message: {
          chat: { id: 1 },
          from: { id: 2 },
          document: { file_id: 'abc123', file_name: 'mockfile.pdf' },
        },
      },
    });
    await handler(req, res, (handler as any).supabase);
    expect(res._getStatusCode()).toBe(200);
    const response = JSON.parse(res._getData());
    expect(response.ok).toBe(true);
    expect(response.file_url).toMatch(/mock.png/);
  });

  it('returns error and notifies user if Supabase insert fails', async () => {
    (handler as any).supabase = {
      from: () => ({
        insert: () => Promise.resolve({ error: { message: 'Supabase down' } }),
        select: () => ({ eq: () => ({ order: () => ({ limit: () => ({ data: [], error: null }) }) }) })
      }),
      storage: { from: () => ({ upload: () => Promise.resolve({ data: { path: 'mock.png' }, error: null }) }) },
    };
    // Mock OpenAI response
    mockOpenAIResponse('Should not be called');
    // Mock Telegram message sending
    (axios.post as jest.Mock).mockResolvedValueOnce({ data: {} });
    const { req, res } = createMocks({
      method: 'POST',
      body: { message: { chat: { id: 1 }, from: { id: 2 }, message_id: 6, text: 'Trigger error' } },
    });
    await handler(req, res, (handler as any).supabase);
    expect(res._getStatusCode()).toBe(200);
    const response = JSON.parse(res._getData());
    expect(response.ok).toBe(false);
    expect(response.error).toMatch(/Supabase down/);
    // Should notify user via Telegram
    expect((axios.post as jest.Mock).mock.calls[0][0]).toContain('/sendMessage');
    expect((axios.post as jest.Mock).mock.calls[0][1].chat_id).toBe(1);
    expect((axios.post as jest.Mock).mock.calls[0][1].text).toMatch(/Supabase down/);
  });

  it('returns error and notifies user if OpenAI API fails', async () => {
    // Patch Supabase to succeed
    (handler as any).supabase = {
      from: () => ({
        insert: () => Promise.resolve({ error: null }),
        select: () => ({ eq: () => ({ order: () => ({ limit: () => ({ data: [], error: null }) }) }) })
      }),
      storage: { from: () => ({ upload: () => Promise.resolve({ data: { path: 'mock.png' }, error: null }) }) },
    };
    // Mock OpenAI API to fail
    (axios.post as jest.Mock).mockImplementationOnce(() => Promise.reject(new Error('OpenAI down')));
    // Mock Telegram message sending
    (axios.post as jest.Mock).mockResolvedValueOnce({ data: {} });
    const { req, res } = createMocks({
      method: 'POST',
      body: { message: { chat: { id: 1 }, from: { id: 2 }, message_id: 7, text: 'Trigger OpenAI error' } },
    });
    await handler(req, res, (handler as any).supabase);
    expect(res._getStatusCode()).toBe(200);
    const response = JSON.parse(res._getData());
    expect(response.ok).toBe(false);
    expect(response.error).toMatch(/OpenAI down/);
    // Should notify user via Telegram
    expect((axios.post as jest.Mock).mock.calls[0][0]).toContain('/sendMessage');
    expect((axios.post as jest.Mock).mock.calls[0][1].chat_id).toBe(1);
    expect((axios.post as jest.Mock).mock.calls[0][1].text).toMatch(/OpenAI down/);
  });
});
