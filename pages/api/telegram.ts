import type { NextApiRequest, NextApiResponse } from 'next';
console.log('[Telegram][BOOT] telegram.ts loaded at', new Date().toISOString());
console.log('[Telegram][BOOT] CWD:', process.cwd());
console.log('[Telegram][BOOT] ENV:', JSON.stringify(process.env, null, 2));
import axios from 'axios';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseClient: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

import {
  downloadTelegramFile,
  uploadToSupabaseStorage,
} from '../../utils/telegram/file';
import { transcribeVoiceWhisper } from '../../utils/telegram/transcription';
import { getLLM } from '../../src/llm/llmTool';
import { agentMessageMemory } from '../../src/orchestration/agentMessageMemory';
import { orchestrator } from '../../src/orchestration/orchestratorSingleton';
import { agentManager } from '../../src/orchestration/agentManager';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Helper: Send message to Telegram
async function sendTelegramMessage(chat_id: number | string, text: string) {
  try {
    await axios.post(`${TELEGRAM_API}/sendMessage`, { chat_id, text });
  } catch (err: any) {
    console.error('[Telegram] sendMessage error:', err);
  }
}

// =====================
// Main handler
// =====================
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  client: SupabaseClient = supabaseClient,
  sendTelegramMessageImpl: typeof sendTelegramMessage = sendTelegramMessage
) {
  console.log('[Telegram Handler] Incoming request:', req.method, req.url);

  // ---------------------------------------------------------------------------
  // 1. Validate request
  // ---------------------------------------------------------------------------
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ ok: false, error: 'Invalid JSON in request body' });
    }
  }

  const message = body.message || body.edited_message;
  if (!message?.from || !message?.chat) {
    return res.status(200).json({ ok: false, error: 'Missing sender or chat information' });
  }

  const chat_id = message.chat.id;
  const user_id = String(message.from.id);
  const telegram_message_id = message.message_id;

  //--------------------------------------------------------------------------
  // 2. Determine message type & extract content
  //--------------------------------------------------------------------------
  let message_type: 'text' | 'document' | 'voice' = 'text';
  let content = '';
  let file_name = '';
  let file_size = 0;
  let mime_type = '';

  try {
    //--------------------------------------------------------------------
    // TEXT MESSAGE ------------------------------------------------------
    //--------------------------------------------------------------------
    if (message.text) {
      message_type = 'text';
      content = message.text.trim();

      // --- Command: /status -------------------------------------------
      if (/^\/?status\b/i.test(content)) {
        const swarmState = orchestrator.getSwarmState();
        const statusLines = swarmState.agents.map((a) => `${a.id}: ${a.status}`);
        await sendTelegramMessageImpl(chat_id, `Live Agents:\n${statusLines.join('\n')}`);
        return res.status(200).json({ ok: true });
      }

      // --- Command: /stop <id> ----------------------------------------
      const stopMatch = content.match(/^\/?stop\s+(\S+)/i);
      if (stopMatch) {
        const id = stopMatch[1];
        try {
          await orchestrator.stopAgent(id);
          await sendTelegramMessageImpl(chat_id, `✅ Agent stopped: ${id}`);
        } catch (err) {
          await sendTelegramMessageImpl(chat_id, `Failed to stop agent ${id}: ${err instanceof Error ? err.message : err}`);
        }
        return res.status(200).json({ ok: true });
      }

      // --- Command: /restart <id> -------------------------------------
      const restartMatch = content.match(/^\/?restart\s+(\S+)/i);
      if (restartMatch) {
        const id = restartMatch[1];
        try {
          const status = await orchestrator.restartAgent(id);
          await sendTelegramMessageImpl(chat_id, `✅ Agent ${id} restarted: ${status}`);
        } catch (err) {
          await sendTelegramMessageImpl(chat_id, `Failed to restart agent ${id}: ${err instanceof Error ? err.message : err}`);
        }
        return res.status(200).json({ ok: true });
      }
    }
    //--------------------------------------------------------------------
    // DOCUMENT ----------------------------------------------------------
    //--------------------------------------------------------------------
    else if (message.document) {
      message_type = 'document';
      const doc = message.document;
      const file_id = doc.file_id;
      const file = await downloadTelegramFile(file_id);
      if (file.file_size > 25 * 1024 * 1024) throw new Error('File too large');

      const url = await uploadToSupabaseStorage(file.buffer, file.file_name, file.mime_type, client);
      content = url ?? '';
      file_name = file.file_name ?? '';
      file_size = file.file_size;
      mime_type = file.mime_type ?? '';

      // Respond with file URL immediately
      return res.status(200).json({ ok: true, file_url: url });
    }
    //--------------------------------------------------------------------
    // VOICE -------------------------------------------------------------
    //--------------------------------------------------------------------
    else if (message.voice) {
      message_type = 'voice';
      const voice = message.voice;
      const file_id = voice.file_id;
      const file = await downloadTelegramFile(file_id);
      if (file.file_size > 25 * 1024 * 1024) throw new Error('File too large');

      content = await transcribeVoiceWhisper(file.buffer, file.mime_type);
    }
    //--------------------------------------------------------------------
    // UNSUPPORTED -------------------------------------------------------
    //--------------------------------------------------------------------
    else {
      await sendTelegramMessageImpl(chat_id, 'Unsupported message type. Only text, voice and documents under 25 MB are supported.');
      return res.status(200).json({ ok: true });
    }

    //--------------------------------------------------------------------
    // 3. Save user message (non-command) in MCP memory ------------------
    //--------------------------------------------------------------------
    await agentMessageMemory.save({
      type: 'chat',
      content,
      role: 'user',
      tags: [],
      provenance: 'telegram',
      user_id,
      thread_id: String(chat_id),
    });

    //--------------------------------------------------------------------
    // 4. Fetch conversation history ------------------------------------
    //--------------------------------------------------------------------
    const history = await agentMessageMemory.fetchRecent({
      thread_id: String(chat_id),
      limit: 10,
    });

    // Log the raw history for debugging
    console.log('[Telegram Handler] Raw history before filtering:', history);
    (history ?? []).forEach((m, i) => {
      console.log(`[Telegram Handler][DEBUG] Message ${i}:`, m.value);
    });

    // Loosen the filter for debugging: only require role to be a string
    let safeHistory = (history ?? [])
      .filter((m: any) => m?.value && typeof m.value.role === 'string')
      .map((m: any) => ({
        role: m.value.role === 'user' ? 'human' : m.value.role === 'agent' ? 'ai' : m.value.role,
        content: m.value.content
      }));

    // Reverse to chronological order (oldest first)
    safeHistory = safeHistory.reverse();

    // Optionally, prepend a system prompt for better context retention
    safeHistory.unshift({ role: 'system', content: 'You are a helpful assistant. Always use the conversation history above to answer as contextually as possible.' });

    // Log the safeHistory after filtering and ordering
    console.log('[Telegram Handler] safeHistory after filtering:', safeHistory);

    if (!Array.isArray(safeHistory) || safeHistory.length === 0) {
      // Defensive: always send at least the current user message
      console.warn('[Telegram Handler] [GPT] History is empty. Falling back to current user message only.', { user_id, chat_id, telegram_message_id, content });
      safeHistory = [{ role: 'user', content }];
    }

    //--------------------------------------------------------------------
    // 5. Call LLM -------------------------------------------------------
    //--------------------------------------------------------------------
    const llm = getLLM();
    const agent_response = await llm.chat(safeHistory);

    //--------------------------------------------------------------------
    // 6. Persist agent response ----------------------------------------
    //--------------------------------------------------------------------
    await agentMessageMemory.save({
      type: 'chat',
      content: agent_response,
      role: 'agent',
      tags: [],
      provenance: 'telegram',
      user_id,
      thread_id: String(chat_id),
    });

    //--------------------------------------------------------------------
    // 7. Send response back to Telegram --------------------------------
    //--------------------------------------------------------------------
    await sendTelegramMessageImpl(chat_id, agent_response);
    return res.status(200).json({ ok: true });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error('[Telegram Handler] Error:', error);
    await sendTelegramMessageImpl(chat_id, `Error: ${error.message}`);
    return res.status(200).json({ ok: false, error: error.message });
  }
}
