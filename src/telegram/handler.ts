import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { parse } from './intentParser';
import { globalState } from './dialogueState';
import { FileService } from './fileService';
import { TelegramApi } from './telegramApi';
import { Controller } from './controller';
import { getOrchestratorSingleton } from '@/orchestration/orchestratorSingleton';
import { getAgentManagerSingleton } from '@/orchestration/agentManagerSingleton';

const { NEXT_PUBLIC_SUPABASE_URL: url,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: key,
        TELEGRAM_BOT_TOKEN: token } = process.env;
if (!url || !key || !token) throw new Error('env missing');

const supa = createClient(url, key);
const files = new FileService(token, supa);
const tg = new TelegramApi(token);

// Controller and orchestrator will be initialized per-request using the singleton


export default async function handler(req: NextApiRequest, res: NextApiResponse, _unused?: unknown, sendTelegramMessage?: (msg: { chat_id: number, text: string }) => Promise<void>) {
  // Allow test injection of sendTelegramMessage
  const send = sendTelegramMessage || ((msg: { chat_id: number, text: string }) => tg.send(msg));
  if (req.method !== 'POST') return res.status(405).end();

  // Always use the orchestrator singleton for Telegram requests
  const orchestrator = await getOrchestratorSingleton();
  const ctrl = new Controller(orchestrator);

  const update = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const msg = update.message || update.edited_message;
  const chatId = msg?.chat?.id;
  if (!chatId) return res.status(200).end();

  try {
    if (msg.text) {
      const txt = msg.text.trim();

      // Dialogue continuation
      const draft = globalState.get(chatId);
      if (draft) {
        // Handle multi-turn: ask for missing agentId or config
        if (draft.waitingFor === 'agentId') {
          if (/\b[a-zA-Z0-9_-]+\b/.test(txt)) {
            draft.intent.agentId = txt.trim();
            const reply = await ctrl.exec(draft.intent);
            await send({ chat_id: chatId, text: reply });
            globalState.clear(chatId);
            return res.status(200).json({ ok: true });
          } else {
            await send({ chat_id: chatId, text: 'Which agent? Please specify the agent ID.' });
            return res.status(200).json({ ok: true });
          }
        }
        if (draft.waitingFor === 'config') {
          try {
            draft.intent.config = JSON.parse(txt);
            const reply = await ctrl.exec(draft.intent);
            await send({ chat_id: chatId, text: reply });
            globalState.clear(chatId);
            return res.status(200).json({ ok: true });
          } catch {
            await send({ chat_id: chatId, text: 'Invalid JSON: Please provide the config as valid JSON.' });
            return res.status(200).json({ ok: true });
          }
        }
      }

      const intent = parse(txt);
      if (intent) {
        // Clarify if agentId or config is missing
        if ((intent.kind === 'stop' || intent.kind === 'restart' || intent.kind === 'delete' || intent.kind === 'update-config') && !intent.agentId) {
          globalState.set(chatId, { intent, waitingFor: 'agentId' });
          await send({ chat_id: chatId, text: 'Which agent? Please specify the agent ID.' });
          return res.status(200).json({ ok: true });
        }
        if (intent.kind === 'update-config' && !intent.config) {
          globalState.set(chatId, { intent, waitingFor: 'config' });
          await send({ chat_id: chatId, text: 'Please send the new config as JSON.' });
          return res.status(200).json({ ok: true });
        }
        // Defensive: handle unknown agent
        if ((intent.kind === 'stop' || intent.kind === 'restart' || intent.kind === 'delete' || intent.kind === 'update-config') && !orch.getAgent(intent.agentId!)) {
          await send({ chat_id: chatId, text: `Agent not found: ${intent.agentId}. Try /status or /help.` });
          return res.status(200).json({ ok: true });
        }
        // Defensive: handle malformed config
        if (intent.kind === 'update-config' && intent.config && typeof intent.config !== 'object') {
          await send({ chat_id: chatId, text: 'Invalid config: Please provide the config as a valid JSON object.' });
          return res.status(200).json({ ok: true });
        }
        const reply = await ctrl.exec(intent);
        await send({ chat_id: chatId, text: reply });
        return res.status(200).json({ ok: true });
      }

      await send({ chat_id: chatId, text: `Sorry, I couldn't understand that. Try /help or /status.` });
      return res.status(200).json({ ok: true });
    }

    if (msg.document) {
      const file = await files.download(msg.document.file_id);
      if (file.size > 25 * 1024 * 1024) throw new Error('file too big');
      const url = await files.upload(file);
      await send({ chat_id: chatId, text: `stored → ${url}` });
      return res.status(200).json({ ok: true });
    }

    await send({ chat_id: chatId, text: 'Unsupported message type.' });
    res.status(200).json({ ok: true });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    await send({ chat_id: chatId, text: `Error: ${error.message}` });
    res.status(500).json({ ok: false, error: error.message });
  }
}
