/* Shared helpers & global mocks for the pages/api/telegram test‑suite */

import axios from 'axios';
import * as supabase from '@supabase/supabase-js';
import { createMocks } from 'node-mocks-http';

/* ──────────────────────────
   Global jest mocks
   ────────────────────────── */
jest.mock('axios');
jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
jest.mock('../src/orchestration/orchestratorSingleton', () => ({
  orchestrator: {
    getSwarmState : jest.fn(),
    stopAgent     : jest.fn(),
    restartAgent  : jest.fn(),
  },
}));
jest.mock('../utils/telegram/db', () => ({
  fetchMessageHistory: jest.fn().mockResolvedValue({ data: [], error: null }),
}));

/* ──────────────────────────
   Exports
   ────────────────────────── */
export const AGENT_ID = 'test-agent';
export const CHAT_ID  = 99999;

export const mockedAxios = axios as jest.Mocked<typeof axios>;

/* Keep original ENV so we can restore it */
export const ORIGINAL_ENV = { ...process.env };

export const setTestEnv = (): void => {
  process.env = {
    ...ORIGINAL_ENV,
    NEXT_PUBLIC_SUPABASE_URL   : 'http://localhost:54321',
    NEXT_PUBLIC_SUPABASE_ANON_KEY : 'anon-key',
    TELEGRAM_BOT_TOKEN         : 'dummy-telegram',
    OPENAI_API_KEY             : 'dummy-openai',
    WHISPER_API_KEY            : 'dummy-whisper',
  };
};

export const resetTestEnv = (): void => {
  process.env = ORIGINAL_ENV;
};

/* Fresh‑handler loader (isolated module scope) */
export const loadHandler = (): any => {
  let handler: any;
  jest.isolateModules(() => {
    handler = require('../pages/api/telegram').default;       // one level up from /test
  });
  return handler;
};

/* Build Telegram‑like POST request */
export const createTelegramUpdate = (body: Record<string, unknown>) =>
  createMocks({ method: 'POST', body: { message: body } });

/* Stub axios → OpenAI */
export const mockOpenAI = (reply: string | Error): void => {
  if (reply instanceof Error) {
    mockedAxios.post.mockRejectedValueOnce(reply);
  } else {
    mockedAxios.post.mockResolvedValueOnce({
      data: { choices: [ { message: { content: reply } } ] },
    });
  }
};

/* Stub Supabase client */
export const mockSupabaseClient = (opts?: { insertErr?: Error|null; uploadErr?: Error|null }): void => {
  (supabase.createClient as jest.Mock).mockReturnValue({
    from: () => ({
      insert : () => Promise.resolve({ error: opts?.insertErr ?? null }),
      select : () => ({ eq: () => ({ order: () => ({ limit: () => ({ data: [], error: null }) }) }) }),
    }),
    storage: {
      from: () => ({
        upload: () => Promise.resolve({
          data : opts?.uploadErr ? null : { path: 'mock.png' },
          error: opts?.uploadErr ?? null,
        }),
      }),
    },
  });
};

/* True for Telegram sendMessage endpoint */
export const isSendMessage = (url: string): boolean => /\/sendMessage$/.test(url);

/* Minimal stubs for history / insert helpers */
export const makeHistoryAndInsertMocks = () => ({
  fetchMessageHistory: jest.fn().mockResolvedValue({ data: [], error: null }),
  insertMessage      : jest.fn().mockResolvedValue({ error: null }),
});
