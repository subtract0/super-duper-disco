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
import { orchestrator } from '../../src/orchestration/orchestratorSingleton';

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

// Main handler
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  client: SupabaseClient = supabaseClient,
  fetchMessageHistoryImpl: typeof fetchMessageHistory = fetchMessageHistory,
  insertMessageImpl: typeof insertMessage = insertMessage,
  sendTelegramMessageImpl: typeof sendTelegramMessage = sendTelegramMessage
) {
  console.log('[Telegram Handler] Incoming request:', req.method, req.url, typeof req.body === 'string' ? req.body.slice(0, 200) : req.body);

  if (req.method !== 'POST') {
    console.warn('[Telegram Handler] Non-POST request received:', req.method);
    return res.status(405).end();
  }
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return res.status(400).json({ ok: false, error: 'Invalid JSON in request body' });
    }
  }
    try {
    console.log('[Telegram Handler] Parsed request body:', body);
    // Defensive: extract message from possible telegram update types
    const message = body.message || body.edited_message || null;
        if (!message) {
      console.warn('[Telegram Handler] No message found in update:', body);
      return res.status(200).json({ ok: false, error: 'No message in update' });
    }
    if (!message.from || !message.chat) {
      console.warn('[Telegram Handler] Missing sender or chat info:', message);
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
      // Status command detection
       const statusPattern = /^\/?status\b/i;
       if (statusPattern.test(content.trim())) {
         const swarmState = orchestrator.getSwarmState();
         const statusLines = swarmState.agents.map(a => `${a.id}: ${a.status}`);
         console.log('[Telegram Handler] /status command received. Returning live agent state.');
         await sendTelegramMessageImpl(chat_id, `Live Agents:\n${statusLines.join('\n')}`);
         return res.status(200).json({ ok: true });
       }
       // Stop command detection
       const stopPattern = /^\/?stop\s+(\S+)/i;
       const stopMatch = content.trim().match(stopPattern);
       if (stopMatch) {
         const id = stopMatch[1];
         console.log('[Telegram Handler] /stop command received for agent:', id);
         await orchestrator.stopAgent(id);
         await sendTelegramMessageImpl(chat_id, `✅ Agent stopped: ${id}`);
         return res.status(200).json({ ok: true });
       }
       // Restart command detection
       const restartPattern = /^\/?restart\s+(\S+)/i;
       const restartMatch = content.trim().match(restartPattern);
       if (restartMatch) {
         const id = restartMatch[1];
         console.log('[Telegram Handler] /restart command received for agent:', id);
         const status = await orchestrator.restartAgent(id);
         await sendTelegramMessageImpl(chat_id, `✅ Agent ${id} restarted: ${status}`);
         return res.status(200).json({ ok: true });
       }
      // Feature request detection via simple pattern
      const featureRequestPattern = /^(build|create|deploy|start|launch)\b/i;
      let isFeatureRequest = featureRequestPattern.test(content.trim());
        try {
          const { v4: uuidv4 } = require('uuid');
          const agentId = `tg-${user_id}-${Date.now()}`;
          console.log('[Telegram Handler] Launching temporary agent for chat:', agentId);
          const launched = await orchestrator.launchAgent({
            id: agentId,
            type: 'langchain', // Use langchain so agent has chat method
            status: 'pending',
            host: 'telegram',
            config: { openAIApiKey: process.env.OPENAI_API_KEY }, // Pass OpenAI key
          });
          // Send the user's message to the agent and get a response
          let agentResponse = '';
          if (launched && launched.id) {
            // Use agentManager to get the actual running instance
            const { agentManager } = require('../../src/orchestration/agentManager');
            const info = agentManager.agents.get(agentId);
            const instance = info?.instance;
            if (instance && typeof instance.chat === 'function') {
              console.log('[Telegram Handler] Using agent.chat for response');
              agentResponse = await instance.chat(content);
            } else if (instance && typeof instance.handleMessage === 'function') {
              console.log('[Telegram Handler] Using agent.handleMessage for response');
              agentResponse = await instance.handleMessage(content);
            } else {
              console.warn('[Telegram Handler] Agent running but no chat/handleMessage');
              agentResponse = 'Agent is running but has no chat/handleMessage method.';
            }
          } else {
            console.error('[Telegram Handler] Failed to launch agent');
            agentResponse = 'Failed to launch agent.';
          }
          // Send agent response back to Telegram
          console.log('[Telegram Handler] Sending agent response to Telegram:', agentResponse);
          await sendTelegramMessageImpl(chat_id, agentResponse);
          // Stop the agent after processing
          await orchestrator.stopAgent(agentId);
        } catch (err) {
          console.error('[Telegram Handler] Agent error:', err);
          await sendTelegramMessageImpl(chat_id, `❌ Agent error: ${err?.message || err}`);
        }
        return res.status(200).json({ ok: true });
      }
      // 2. Image (photo)
      else if (message.photo) {
        message_type = 'image';
        // Get highest-res photo
        const photo = message.photo[message.photo.length - 1];
        const file_id = photo.file_id;
        const file = await downloadTelegramFile(file_id);
        if (file.file_size > 25 * 1024 * 1024) throw new Error('File too large');
        const url = await uploadToSupabaseStorage(file.buffer, file.file_name, file.mime_type, client);
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
        const url = await uploadToSupabaseStorage(file.buffer, file.file_name, file.mime_type, client);
        content = url ?? '';
        file_name = file.file_name ?? '';
        file_size = file.file_size;
        mime_type = file.mime_type ?? '';
        // Save message to Supabase
        const { error: insertError } = await insertMessageImpl({
          user_id,
          message_type,
          content,
          file_name: file_name ?? '',
          file_size,
          mime_type: mime_type ?? '',
          telegram_message_id,
          role: 'user',
        }, client);
        if (insertError) {
          const errorMsg = typeof insertError === 'object' && insertError.message ? insertError.message : String(insertError);
          await sendTelegramMessageImpl(chat_id, `Error: ${errorMsg}`);
          return res.status(200).json({ ok: false, error: errorMsg });
        }
        // Return file_url for document uploads
        return res.status(200).json({ ok: true, file_url: url });
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
        console.warn('[Telegram Handler] Unsupported message type:', message);
        await sendTelegramMessageImpl(chat_id, 'Unsupported message type. Only text, images, voice, and files under 25MB are supported.');
        return res.status(200).json({ ok: true });
      }
      // Save message to Supabase
      const { error: insertError } = await insertMessageImpl({
        user_id,
        message_type,
        content,
        file_name: file_name ?? '',
        file_size,
        mime_type: mime_type ?? '',
        telegram_message_id,
        role: 'user',
      }, client);
      if (insertError) {
        const errorMsg = typeof insertError === 'object' && insertError.message ? insertError.message : String(insertError);
        await sendTelegramMessageImpl(chat_id, `Error: ${errorMsg}`);
        return res.status(200).json({ ok: false, error: errorMsg });
      }

      // Fetch conversation history (last 10 messages)
      const { data: history, error: historyError } = await fetchMessageHistoryImpl(user_id, client);
      if (historyError) console.error('[Telegram Handler] Supabase history fetch error:', historyError);
      console.log('[Telegram Handler] [GPT] Retrieved history:', history);
      if (!Array.isArray(history)) {
        console.error('[Telegram Handler] [GPT] History is not an array:', history);
      }
      // Call OpenAI GPT-4.1 API
      console.log('[Telegram Handler] [GPT] Calling OpenAI for user:', user_id);
      console.log('[Telegram Handler] [GPT] DEBUG: About to call OpenAI');
      // Defensive: filter out any null/undefined or malformed history items
      const safeHistory = (history ?? []).filter((msg: any) => msg && typeof msg.role === 'string' && typeof msg.content === 'string');
      let agent_response: string;
      try {
        console.log('[Telegram Handler] [GPT] Calling OpenAI GPT for response...');
        agent_response = await callOpenAIGPT(safeHistory);
        console.log('[Telegram Handler] [GPT] OpenAI GPT response:', agent_response);
        if (typeof agent_response !== 'string' || !agent_response.trim()) {
          console.error('[Telegram Handler] [GPT] OpenAI returned empty/invalid response');
          throw new Error('OpenAI returned an empty or invalid response');
        }
      } catch (err: any) {
        console.error('[Telegram Handler] [GPT] OpenAI error caught:', err);
        console.log('[Telegram Handler] [GPT] DEBUG: OpenAI error path hit');
        let errorMsg;
        // Always return 'OpenAI down' if OpenAI is unreachable or fails
        if (err instanceof Error && /OpenAI down/i.test(err.message)) {
          errorMsg = 'OpenAI down';
        } else if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' && /openai/i.test(err.message)) {
          errorMsg = 'OpenAI down';
        } else {
          errorMsg = err?.message || err || 'OpenAI down';
        }
        await sendTelegramMessageImpl(chat_id, `Error: ${errorMsg}`);
        return res.status(200).json({ ok: false, error: errorMsg });
      }
      console.log('[Telegram Handler] [GPT] OpenAI response:', agent_response);

      // Save agent response
      console.log('[Telegram Handler] [GPT] Sending OpenAI response to Telegram:', agent_response);
      await sendTelegramMessageImpl(chat_id, agent_response);
      res.status(200).json({ ok: true });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      console.error('[Telegram Handler] [GPT] Handler error:', error);
      if (typeof chat_id !== 'undefined') {
        await sendTelegramMessageImpl(chat_id, `Error: ${error.message}`);
      }
      // Always return a string error
      res.status(200).json({ ok: false, error: String(error.message || error.toString() || 'Unknown error') });
    }
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error('[Telegram Handler] [GPT] Top-level handler error:', error);
    // Always return a string error
    res.status(200).json({ ok: false, error: String(error.message || error.toString() || 'Unknown error') });
  }
  console.log('[Telegram Handler] Request handling complete.');
}
