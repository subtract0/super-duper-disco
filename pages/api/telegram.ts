import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseClient: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
import { downloadTelegramFile, uploadToSupabaseStorage } from '../../utils/telegram/file';
import { transcribeVoiceWhisper } from '../../utils/telegram/transcription';
import { callOpenAIGPT } from '../../utils/telegram/openai';
import { insertMessage, fetchMessageHistory } from '../../utils/telegram/db';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Helper: Send message to Telegram
async function sendTelegramMessage(chat_id: number | string, text: string) {
  await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id, text });
}

// Main handler
export default async function handler(req: NextApiRequest, res: NextApiResponse, client: SupabaseClient = supabaseClient) {
  if (req.method !== 'POST') return res.status(405).end();
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return res.status(400).json({ ok: false, error: 'Invalid JSON in request body' });
    }
  }
    try {
    // Defensive: extract message from possible telegram update types
    const message = body.message || body.edited_message || null;
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
      // Feature request detection (LLM-powered intent extraction)
      const featureRequestPattern = /^(build|create|deploy|start|launch)\b/i;
      let isFeatureRequest = featureRequestPattern.test(content.trim());
      let agentType = 'native';
      let agentConfig: any = {};
      if (!isFeatureRequest) {
        // Use LLM to extract intent if not a simple command
        try {
          const { callOpenAIGPT } = require('../../utils/telegram/openai');
          const llmPrompt = [
            { role: 'system', content: 'You are an intent extraction assistant for a multi-agent orchestrator. If the user is asking to create, build, launch, or deploy an agent or feature, respond with a JSON object containing { intent: "create_agent", agent_type: ..., config: ... }. If not, respond with { intent: "none" }.' },
            { role: 'user', content }
          ];
          const llmResponse = await callOpenAIGPT(llmPrompt);
          let llmIntent;
          try { llmIntent = JSON.parse(llmResponse); } catch (e) {}
          if (llmIntent && llmIntent.intent === 'create_agent') {
            isFeatureRequest = true;
            agentType = llmIntent.agent_type || 'native';
            agentConfig = llmIntent.config || {};
          }
        } catch (e) {
          // fallback: ignore LLM error, do not trigger agent creation
        }
      }
      if (isFeatureRequest) {
        // Trigger agent creation via orchestrator
        try {
          const { orchestrator } = require('../../src/orchestration/orchestratorSingleton');
          const { v4: uuidv4 } = require('uuid');
          const agentId = uuidv4();
          const launched = await orchestrator.launchAgent({
            id: agentId,
            type: agentType,
            status: 'pending',
            host: 'telegram',
            config: agentConfig,
          });
          await sendTelegramMessage(chat_id, `✅ Agent created: ${launched.id}\nType: ${launched.type}`);
        } catch (err) {
          await sendTelegramMessage(chat_id, `❌ Failed to create agent: ${err?.message || err}`);
        }
        return res.status(200).json({ ok: true });
      }
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
    // Save message to Supabase
    const { error: insertError } = await insertMessage({
      user_id,
      message_type,
      content,
      file_name: file_name ?? '',
      file_size,
      mime_type: mime_type ?? '',
      telegram_message_id,
      role: 'user',
    }, client);
    if (insertError) console.error('[Supabase] Insert error:', insertError);

    // Fetch conversation history (last 10 messages)
    const { data: history, error: historyError } = await fetchMessageHistory(user_id, client);
    if (historyError) console.error('[Supabase] History fetch error:', historyError);
    console.log('[GPT] Retrieved history:', history);
    if (!Array.isArray(history)) {
      console.error('[GPT] History is not an array:', history);
    }
    // Call OpenAI GPT-4.1 API
    console.log('[GPT] Calling OpenAI for user:', user_id);
    // Defensive: filter out any null/undefined or malformed history items
    const safeHistory = (history ?? []).filter((msg: any) => msg && typeof msg.role === 'string' && typeof msg.content === 'string');
    const agent_response = await callOpenAIGPT(safeHistory);
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
