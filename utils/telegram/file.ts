import axios from 'axios';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const TELEGRAM_FILE_API = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}`;

// Download file from Telegram
export async function downloadTelegramFile(file_id: string): Promise<{ buffer: Buffer, file_name: string, mime_type: string, file_size: number }> {
  const { data: fileResp } = await axios.get(`${TELEGRAM_API}/getFile?file_id=${file_id}`) as { data: { result: { file_path: string } } };
  const file_path = fileResp.result.file_path;
  const url = `${TELEGRAM_FILE_API}/${file_path}`;
  const { data, headers } = await axios.get(url, { responseType: 'arraybuffer' }) as { data: ArrayBuffer, headers: Record<string, string> };
  return {
    buffer: Buffer.from(data),
    file_name: file_path.split('/').pop() ?? file_id,
    mime_type: headers['content-type'] ?? '',
    file_size: parseInt(headers['content-length'] ?? '0', 10),
  };
}

// Upload file to Supabase Storage
export async function uploadToSupabaseStorage(buffer: Buffer, file_name: string, mime_type: string, supabaseClient = supabase) {
  const { data, error } = await supabaseClient.storage.from('messages').upload(file_name, buffer, {
    contentType: mime_type,
    upsert: true,
  });
  if (error) throw error;
  return data?.path ? `${SUPABASE_URL}/storage/v1/object/public/messages/${data.path}` : null;
}
