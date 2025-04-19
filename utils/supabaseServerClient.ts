import { createClient } from '@supabase/supabase-js';

// Use the service role key for server-side operations only
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (supabaseServiceRoleKey) {
  console.log('[supabaseServerClient] Service role key loaded: length', supabaseServiceRoleKey.length);
} else {
  console.error('[supabaseServerClient] Service role key NOT loaded!');
}

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('[supabaseServerClient] SUPABASE_SERVICE_ROLE_KEY and URL are required for server-side Supabase client');
}

const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey);

export { supabaseServer };
