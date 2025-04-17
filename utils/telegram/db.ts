import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function insertMessage(message: any, supabaseClient = supabase) {
  return await supabaseClient.from('messages').insert([message]);
}

export async function fetchMessageHistory(user_id: string, supabaseClient = supabase) {
  return await supabaseClient
    .from('messages')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
    .limit(10);
}
