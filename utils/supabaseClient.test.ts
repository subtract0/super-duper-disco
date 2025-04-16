import { createClient } from '@supabase/supabase-js';

describe('supabaseClient', () => {
  it('creates a client without error', () => {
    const client = createClient('https://test.supabase.co', 'public-anon-key');
    expect(client).toBeDefined();
  });
});
