import { createClient } from '@supabase/supabase-js';

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('supabaseUrl and supabaseAnonKey are required in production');
  } else {
    // Use dummy values for test/dev
    supabaseUrl = 'http://localhost:54321';
    supabaseAnonKey = 'anon-key';
    console.warn('[supabaseClient] Using dummy Supabase credentials for test/dev');
  }
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export { supabase };
