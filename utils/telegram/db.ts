import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function insertMessage(message: any, supabaseClient?: any) {
  if (!supabaseClient) throw new Error('supabaseClient is undefined in insertMessage');
  // Validate required fields and set sensible defaults
  const validMessage = {
    user_id: typeof message.user_id === 'string' ? message.user_id : '',
    message_type: typeof message.message_type === 'string' ? message.message_type : 'text',
    content: typeof message.content === 'string' ? message.content : '',
    file_name: typeof message.file_name === 'string' ? message.file_name : '',
    file_size: typeof message.file_size === 'number' ? message.file_size : 0,
    mime_type: typeof message.mime_type === 'string' ? message.mime_type : '',
    telegram_message_id: typeof message.telegram_message_id === 'number' ? message.telegram_message_id : null,
    role: typeof message.role === 'string' ? message.role : 'user',
    created_at: message.created_at || new Date().toISOString(),
  };
  try {
    const { data, error } = await supabaseClient.from('messages').insert([validMessage]);
    if (error) {
      console.error('[insertMessage] Supabase insert error:', error, '\nMessage:', validMessage);
    }
    return { data, error };
  } catch (err) {
    console.error('[insertMessage] Exception during insert:', err, '\nMessage:', validMessage);
    return { data: null, error: err };
  }
}

export async function fetchMessageHistory(user_id: string, supabaseClient?: any) {
  if (!supabaseClient) throw new Error('supabaseClient is undefined in fetchMessageHistory');
  return await supabaseClient
    .from('messages')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false })
    .limit(10);
}
