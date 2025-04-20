import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { parse } from './intentParser';
import { globalState } from './dialogueState';
import { FileService } from './fileService';
import { TelegramApi } from './telegramApi';
import { Controller } from './controller';
import { AgentOrchestrator } from '@/orchestration/agentOrchestrator';
import { agentManager } from '@/orchestration/agentManagerSingleton';
import { MessageBus } from '@/orchestration/orchestrator/bus';

const { NEXT_PUBLIC_SUPABASE_URL: url,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: key,
        TELEGRAM_BOT_TOKEN: token } = process.env;
if (!url || !key || !token) throw new Error('env missing');

const supa = createClient(url, key);
const files = new FileService(token, supa);
const tg = new TelegramApi(token);
const orch = new AgentOrchestrator({ manager: agentManager, bus: new MessageBus() });
const ctrl = new Controller(orch);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

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
        // ... handle dialogue continuation here ...
      }

      const intent = parse(txt);
      if (intent) {
        const reply = await ctrl.exec(intent);
        await tg.send({ chat_id: chatId, text: reply });
        return res.status(200).json({ ok: true });
      }

      await tg.send({ chat_id: chatId, text: '❓ Try /help' });
      return res.status(200).json({ ok: true });
    }

    if (msg.document) {
      const file = await files.download(msg.document.file_id);
      if (file.size > 25 * 1024 * 1024) throw new Error('file too big');
      const url = await files.upload(file);
      await tg.send({ chat_id: chatId, text: `stored → ${url}` });
      return res.status(200).json({ ok: true });
    }

    await tg.send({ chat_id: chatId, text: 'Unsupported message type.' });
    res.status(200).json({ ok: true });
  } catch (err: any) {
    await tg.send({ chat_id: chatId, text: `Error: ${err.message}` });
    res.status(500).json({ ok: false, error: err.message });
  }
}
