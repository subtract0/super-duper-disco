import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import FormData from 'form-data';

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!; // Add to .env
const WHISPER_API_KEY = process.env.WHISPER_API_KEY!; // Add to .env

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const TELEGRAM_FILE_API = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}`;

// Helper: Send message to Telegram
async function sendTelegramMessage(chat_id: number | string, text: string) {
  await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id, text });
}
// Helper: Download file from Telegram
async function downloadTelegramFile(file_id: string): Promise<{ buffer: Buffer, file_name: string, mime_type: string, file_size: number }> {
  // 1. Get file path
  const { data: fileResp } = await axios.get(`${TELEGRAM_API}/getFile?file_id=${file_id}`) as { data: { result: { file_path: string } } };
  const file_path = fileResp.result.file_path;
  // 2. Download file
  const url = `${TELEGRAM_FILE_API}/${file_path}`;
  const { data, headers } = await axios.get(url, { responseType: 'arraybuffer' }) as { data: ArrayBuffer, headers: Record<string, string> };
  return {
    buffer: Buffer.from(data),
    file_name: file_path.split('/').pop() ?? file_id,
    mime_type: headers['content-type'] ?? '',
    file_size: parseInt(headers['content-length'] ?? '0', 10),
  };
}
// Helper: Upload file to Supabase Storage
async function uploadToSupabaseStorage(buffer: Buffer, file_name: string, mime_type: string, supabaseClient = supabase) {
  const { data, error } = await supabaseClient.storage.from('messages').upload(file_name, buffer, {
    contentType: mime_type,
    upsert: true,
  });
  if (error) throw error;
  return data?.path ? `${SUPABASE_URL}/storage/v1/object/public/messages/${data.path}` : null;
}
// Helper: Transcribe voice (Whisper API)
async function transcribeVoiceWhisper(buffer: Buffer, mime_type: string): Promise<string> {
  // Node.js FormData for Whisper API
  const formData = new FormData();
  formData.append('file', buffer, {
    filename: 'voice.ogg',
    contentType: mime_type || 'audio/ogg',
  });
  formData.append('model', 'whisper-1');
  const { data } = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
    headers: {
      'Authorization': `Bearer ${WHISPER_API_KEY}`,
      ...formData.getHeaders(),
    }
  }) as { data: { text: string } };
  return data.text;
}
// Helper: Call OpenAI GPT-4.1 API
type Message = { role: string; content: string };
async function callOpenAIGPT(messages: Message[]): Promise<string> {
  console.log('[GPT] Calling OpenAI with messages:', JSON.stringify(messages, null, 2));
  // Format messages for OpenAI API
  const formattedMessages = (messages || [])
    .reverse()
    .filter((msg) => msg && typeof msg.role === 'string' && typeof msg.content === 'string')
    .map((msg) => ({
      role: msg.role === 'agent' ? 'assistant' : 'user',
      content: msg.content,
    }));
  // Add system prompt (optional)
  formattedMessages.unshift({
    role: 'system',
    content: 'You are a helpful assistant for a Telegram user. Respond concisely and clearly.',
  });
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o-mini',
      messages: formattedMessages,
      max_tokens: 1024,
      temperature: 0.7,
    },
    {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  ) as { data: { choices: { message: { content: string } }[] } };
  return response.data.choices[0].message.content.trim();
}
// Main handler
export default async function handler(req: NextApiRequest, res: NextApiResponse, supabaseClient = supabase) {
  if (req.method !== 'POST') return res.status(405).end();
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return res.status(400).json({ ok: false, error: 'Invalid JSON in request body' });
    }
  }
  console.log('[DEBUG] Full request body:', JSON.stringify(body));
  try {
    // Defensive: extract message from possible telegram update types
    const message = body.message || body.edited_message || null;
    console.log('[DEBUG] Incoming message:', JSON.stringify(message));
    if (!message) return res.status(200).json({ ok: false, error: 'No message in update' });
    if (!message.from || !message.chat) {
      return res.status(200).json({ ok: false, error: 'Missing sender or chat information (message.from or message.chat)' });
    }
    const chat_id = message.chat.id;
    const user_id = String(message.from.id);
    const telegram_message_id = message.message_id;

  let message_type = 'text';
  let content = '';
  let file_name: string = '';
  let file_size: number = 0;
  let mime_type: string = '';

  try {
    // 1. Text
    if (message.text) {
      message_type = 'text';
      content = message.text;
    }
    // 2. Image (photo)
    else if (message.photo) {
      message_type = 'image';
      // Get highest-res photo
      const photo = message.photo[message.photo.length - 1];
      const file_id = photo.file_id;
      const file = await downloadTelegramFile(file_id);
      if (file.file_size > 25 * 1024 * 1024) throw new Error('File too large');
      const url = await uploadToSupabaseStorage(file.buffer, file.file_name, file.mime_type, supabaseClient);
      content = url ?? '';
      file_name = file.file_name ?? '';
      file_size = file.file_size;
      mime_type = file.mime_type ?? '';
    }
    // 3. Document (PDF, TXT, etc.)
    else if (message.document) {
      message_type = 'document';
      const doc = message.document;
      const file_id = doc.file_id;
      const file = await downloadTelegramFile(file_id);
      if (file.file_size > 25 * 1024 * 1024) throw new Error('File too large');
      const url = await uploadToSupabaseStorage(file.buffer, file.file_name, file.mime_type, supabaseClient);
      content = url ?? '';
      file_name = file.file_name ?? '';
      file_size = file.file_size;
      mime_type = file.mime_type ?? '';
    }
    // 4. Voice
    else if (message.voice) {
      message_type = 'voice';
      const voice = message.voice;
      const file_id = voice.file_id;
      const file = await downloadTelegramFile(file_id);
      if (file.file_size > 25 * 1024 * 1024) throw new Error('File too large');
      // Transcribe
      content = await transcribeVoiceWhisper(file.buffer, file.mime_type);
      file_name = '';
      file_size = 0;
      mime_type = '';

    }
    // 5. Unsupported
    else {
      await sendTelegramMessage(chat_id, 'Unsupported message type. Only text, images, voice, and files under 25MB are supported.');
      return res.status(200).json({ ok: true });
    }
    // Debug: Log all message fields before insert
    console.log('[DEBUG] Insert fields:', { user_id, message_type, content, file_name, file_size, mime_type, telegram_message_id, role: 'user' });
    // Save message to Supabase
    const { error: insertError } = await supabaseClient.from('messages').insert([
      {
        user_id,
        message_type,
        content,
        file_name: file_name ?? '',
        file_size,
        mime_type: mime_type ?? '',
        telegram_message_id,
        role: 'user',
      },
    ]);
    if (insertError) console.error('[Supabase] Insert error:', insertError);

    // Fetch conversation history (last 10 messages)
    const { data: history, error: historyError } = await supabaseClient
      .from('messages')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(10);
    if (historyError) console.error('[Supabase] History fetch error:', historyError);
    console.log('[GPT] Retrieved history:', history);
    if (!Array.isArray(history)) {
      console.error('[GPT] History is not an array:', history);
    }
    // Call OpenAI GPT-4.1 API
    console.log('[GPT] Calling OpenAI for user:', user_id);
    // Defensive: filter out any null/undefined or malformed history items
    const safeHistory = (history ?? []).filter((msg: any) => msg && typeof msg.role === 'string' && typeof msg.content === 'string');
    const agent_response = await callOpenAIGPT(safeHistory as Message[]);
    console.log('[GPT] OpenAI response:', agent_response);

    // Save agent response
      await sendTelegramMessage(chat_id, agent_response);
      res.status(200).json({ ok: true });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      console.error('[GPT] Error:', error);
      if (typeof chat_id !== 'undefined') {
        await sendTelegramMessage(chat_id, `Error: ${error.message}`);
      }
      res.status(200).json({ ok: false, error: error.message });
    }
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error('[GPT] Error:', error);
    res.status(200).json({ ok: false, error: error.message });
  }
}
