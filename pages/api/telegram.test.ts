import { createMocks } from 'node-mocks-http';
import handler from './telegram';
import * as supabase from '@supabase/supabase-js';
import axios from 'axios';

jest.mock('@supabase/supabase-js');
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
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const response = JSON.parse(res._getData());
    console.log('Full response:', response);
    if (!response.ok) {
      throw new Error('Test failure response: ' + (response.error || JSON.stringify(response)));
    }
    expect(response).toMatchObject({ ok: true });
  });
});
