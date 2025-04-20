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
// Simple intent parser for agent management
// =====================
function parseAgentIntent(text: string): { intent: string; agentId?: string; type?: string; config?: any } | null {
  const lower = text.toLowerCase();
  // Stop
  const stop = lower.match(/\b(stop|terminate|kill)\s+(agent|the)?\s*([\w-]+)/);
  if (stop) return { intent: 'stop', agentId: stop[3] };
  // Restart
  const restart = lower.match(/\b(restart|recover|reload)\s+(agent|the)?\s*([\w-]+)/);
  if (restart) return { intent: 'restart', agentId: restart[3] };
  // Launch
  const launch = lower.match(/\b(launch|start|create|deploy)\s+(agent|the)?\s*([\w-]+)(?:\s+as\s+(\w+))?/);
  if (launch) return { intent: 'launch', agentId: launch[3], type: launch[4] };
  // Delete
  const del = lower.match(/\b(delete|remove|destroy)\s+(agent|the)?\s*([\w-]+)/);
  if (del) return { intent: 'delete', agentId: del[3] };
  // Update config
  const upd = lower.match(/\b(update|change|set)\s+(config|configuration)\s+for\s+(agent|the)?\s*([\w-]+)\s+to\s+(.+)/);
  if (upd) {
    try {
      const config = JSON.parse(upd[5]);
      return { intent: 'update-config', agentId: upd[4], config };
    } catch {
      return { intent: 'update-config', agentId: upd[4] };
    }
  }
  return null;
}

// =====================
// In-memory per-user dialogue state
// =====================
const singletonUserDialogueState: Record<string, any> = {};


// =====================
// Main handler
// =====================
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  client: SupabaseClient = supabaseClient,
  sendTelegramMessageImpl: typeof sendTelegramMessage = sendTelegramMessage,
  injectedUserDialogueState?: Record<string, any>
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

      // --- Command: /help -------------------------------------------
      if (/^\/?help\b/i.test(content)) {
        const helpMsg = `🤖 *Agent Orchestrator Commands*\n\n/status - List all live agents and their status\n/stop <id> - Stop a running agent by ID\n/restart <id> - Restart a crashed agent by ID\n/launch <id> [type] [config as JSON] - Launch a new agent (type defaults to 'native')\n/msg <from> <to> <message> - Send a message from one agent to another (A2A)\n/logs <id> - Show last logs for an agent\n/workflow <task> - Trigger a collaborative multi-agent workflow\n/help - Show this help message`;
        await sendTelegramMessageImpl(chat_id, helpMsg);
        return res.status(200).json({ ok: true });
      }

      // --- Command: /workflow <task> -------------------------------
      const workflowMatch = content.match(/^\/?workflow\s+([\s\S]+)/i);
      if (workflowMatch) {
        const task = workflowMatch[1];
        try {
          // Use MultiAgentWorkflow.collaborativeSolve if available, else fallback to orchestrator.runProtocol
          let result;
          let summary;
          // Dynamically import MultiAgentWorkflow if not already available
          let MultiAgentWorkflow;
          try {
            MultiAgentWorkflow = require('../../src/orchestration/multiAgentWorkflow').MultiAgentWorkflow;
          } catch {}
          if (MultiAgentWorkflow) {
            // Example agent configs, should be replaced with real agent configs if available
            const agentConfigs = [
              { id: 'planner', role: 'Planner', openAIApiKey: process.env.OPENAI_API_KEY || '', systemPrompt: 'You are the planner.' },
              { id: 'researcher', role: 'Researcher', openAIApiKey: process.env.OPENAI_API_KEY || '', systemPrompt: 'You are the researcher.' },
              { id: 'developer', role: 'Developer', openAIApiKey: process.env.OPENAI_API_KEY || '', systemPrompt: 'You are the developer.' },
              { id: 'devops', role: 'DevOps', openAIApiKey: process.env.OPENAI_API_KEY || '', systemPrompt: 'You are the devops.' },
            ];
            const workflow = new MultiAgentWorkflow(agentConfigs);
            result = await workflow.collaborativeSolve(task, 3);
            summary = Array.isArray(result) ? result.join('\n') : JSON.stringify(result, null, 2);
          } else if (typeof orchestrator.runProtocol === 'function') {
            result = await orchestrator.runProtocol(task);
            summary = Array.isArray(result) ? result.join('\n') : JSON.stringify(result, null, 2);
          } else {
            throw new Error('No collaborative workflow implementation found.');
          }
          await sendTelegramMessageImpl(chat_id, `🤝 Workflow complete!\n${summary}`);
        } catch (err) {
          await sendTelegramMessageImpl(chat_id, `Failed to run workflow: ${err instanceof Error ? err.message : err}`);
        }
        return res.status(200).json({ ok: true });
      }

      // --- Command: /msg <from> <to> <message> ----------------------
      const msgMatch = content.match(/^\/?msg\s+(\S+)\s+(\S+)\s+([\s\S]+)/i);
      if (msgMatch) {
        const from = msgMatch[1];
        const to = msgMatch[2];
        const message = msgMatch[3];
        try {
          await orchestrator.sendAgentMessage({ from, to, content: message, timestamp: Date.now() });
          await sendTelegramMessageImpl(chat_id, `📨 Message sent from ${from} to ${to}.`);
        } catch (err) {
          await sendTelegramMessageImpl(chat_id, `Failed to send message: ${err instanceof Error ? err.message : err}`);
        }
        return res.status(200).json({ ok: true });
      }

      // --- Command: /logs <id> --------------------------------------
      const logsMatch = content.match(/^\/?logs\s+(\S+)/i);
      if (logsMatch) {
        const id = logsMatch[1];
        try {
          const logs = agentManager.getAgentLogs(id) || [];
          const lastLogs = logs.slice(-10).join('\n');
          await sendTelegramMessageImpl(chat_id, `📝 Last logs for ${id}:\n${lastLogs || 'No logs found.'}`);
        } catch (err) {
          await sendTelegramMessageImpl(chat_id, `Failed to fetch logs: ${err instanceof Error ? err.message : err}`);
        }
        return res.status(200).json({ ok: true });
      }

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

      // --- Command: /launch <id> [type] [config as JSON] -------------
      const launchMatch = content.match(/^\/?launch\s+(\S+)(?:\s+(\S+))?(?:\s+(.+))?/i);
      if (launchMatch) {
        const id = launchMatch[1];
        const type = launchMatch[2] || 'native';
        let config = {};
        try {
          if (launchMatch[3]) config = JSON.parse(launchMatch[3]);
        } catch (e) {
          await sendTelegramMessageImpl(chat_id, `⚠️ Invalid JSON for config. Launching with empty config.`);
        }
        try {
          await orchestrator.launchAgent({ id, type, status: 'pending', host: '', config });
          await sendTelegramMessageImpl(chat_id, `✅ Agent launched: ${id} (${type})`);
        } catch (err) {
          await sendTelegramMessageImpl(chat_id, `Failed to launch agent ${id}: ${err instanceof Error ? err.message : err}`);
        }
        return res.status(200).json({ ok: true });
      }

      // --- Natural-language intent parsing for agent management ---
      // Check for pending dialogue state
      const dialogueState = injectedUserDialogueState || singletonUserDialogueState;
      if (dialogueState[user_id]) {
        const pending = dialogueState[user_id];
        // Try to fill missing info
        if (!pending.agentId && content) {
          pending.agentId = content.trim();
        } else if (pending.intent === 'update-config' && !pending.config && content) {
          try {
            pending.config = JSON.parse(content);
          } catch {
            await sendTelegramMessageImpl(chat_id, `Please provide the config as valid JSON.`);
            return res.status(200).json({ ok: false, error: 'Invalid config JSON' });
          }
        }
        // If all required info present, execute
        if (pending.intent && pending.agentId && (pending.intent !== 'update-config' || pending.config)) {
          try {
            switch (pending.intent) {
              case 'stop':
                await orchestrator.stopAgent(pending.agentId);
                await sendTelegramMessageImpl(chat_id, `✅ Agent stopped: ${pending.agentId}`);
                break;
              case 'restart':
                await orchestrator.restartAgent(pending.agentId);
                await sendTelegramMessageImpl(chat_id, `✅ Agent restarted: ${pending.agentId}`);
                break;
              case 'launch':
                await orchestrator.launchAgent({ id: pending.agentId, type: pending.type || 'native', status: 'pending', host: '', config: {} });
                await sendTelegramMessageImpl(chat_id, `✅ Agent launched: ${pending.agentId} (${pending.type || 'native'})`);
                break;
              case 'delete':
                await orchestrator.stopAgent(pending.agentId);
                await sendTelegramMessageImpl(chat_id, `🗑️ Agent deleted (stopped): ${pending.agentId}`);
                break;
              case 'update-config':
                const updated = await orchestrator.updateAgentConfig(pending.agentId, pending.config);
                if (updated) {
                  await sendTelegramMessageImpl(chat_id, `⚙️ Agent config updated: ${pending.agentId}`);
                } else {
                  await sendTelegramMessageImpl(chat_id, `❌ Failed to update config for agent: ${pending.agentId}`);
                }
                break;
              default:
                await sendTelegramMessageImpl(chat_id, `Sorry, I couldn't understand your request. Try /help for available commands.`);
            }
          } catch (err) {
            await sendTelegramMessageImpl(chat_id, `Failed to ${pending.intent.replace('-',' ')} agent: ${err instanceof Error ? err.message : err}`);
          }
          delete dialogueState[user_id];
          return res.status(200).json({ ok: true });
        } else {
          // Still missing info
          if (!pending.agentId) {
            await sendTelegramMessageImpl(chat_id, `Which agent do you want to ${pending.intent.replace('-',' ')}? Please specify the agent ID.`);
          } else if (pending.intent === 'update-config' && !pending.config) {
            await sendTelegramMessageImpl(chat_id, `Please send the new config as JSON.`);
          }
          return res.status(200).json({ ok: false, error: 'Still missing info' });
        }
      }

      const intent = parseAgentIntent(content);
      if (intent) {
        if (!intent.agentId && ['stop','restart','launch','delete','update-config'].includes(intent.intent)) {
          dialogueState[user_id] = intent;
          await sendTelegramMessageImpl(chat_id, `Which agent do you want to ${intent.intent.replace('-',' ')}? Please specify the agent ID.`);
          return res.status(200).json({ ok: false, error: 'Missing agent ID' });
        }
        if (intent.intent === 'update-config' && !intent.config) {
          dialogueState[user_id] = intent;
          await sendTelegramMessageImpl(chat_id, `Please send the new config as JSON.`);
          return res.status(200).json({ ok: false, error: 'Missing config JSON' });
        }
        try {
          switch (intent.intent) {
            case 'stop':
              await orchestrator.stopAgent(intent.agentId!);
              await sendTelegramMessageImpl(chat_id, `✅ Agent stopped: ${intent.agentId}`);
              break;
            case 'restart':
              await orchestrator.restartAgent(intent.agentId!);
              await sendTelegramMessageImpl(chat_id, `✅ Agent restarted: ${intent.agentId}`);
              break;
            case 'launch':
              await orchestrator.launchAgent({ id: intent.agentId!, type: intent.type || 'native', status: 'pending', host: '', config: {} });
              await sendTelegramMessageImpl(chat_id, `✅ Agent launched: ${intent.agentId} (${intent.type || 'native'})`);
              break;
            case 'delete':
              await orchestrator.stopAgent(intent.agentId!);
              await sendTelegramMessageImpl(chat_id, `🗑️ Agent deleted (stopped): ${intent.agentId}`);
              break;
            case 'update-config':
              const updated = await orchestrator.updateAgentConfig(intent.agentId!, intent.config);
              if (updated) {
                await sendTelegramMessageImpl(chat_id, `⚙️ Agent config updated: ${intent.agentId}`);
              } else {
                await sendTelegramMessageImpl(chat_id, `❌ Failed to update config for agent: ${intent.agentId}`);
              }
              break;
            default:
              await sendTelegramMessageImpl(chat_id, `Sorry, I couldn't understand your request. Try /help for available commands.`);
          }
        } catch (err) {
          await sendTelegramMessageImpl(chat_id, `Failed to ${intent.intent.replace('-',' ')} agent: ${err instanceof Error ? err.message : err}`);
        }
        return res.status(200).json({ ok: true });
      }
      // Fallback: couldn't parse intent
      await sendTelegramMessageImpl(chat_id, `Sorry, I couldn't understand your request. Try /help for available commands or specify clearly what you want to do with which agent.`);
      return res.status(200).json({ ok: false, error: 'Unrecognized input' });
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
    const systemPrompt = { role: 'system', content: 'You are a helpful assistant. Always use the conversation history above to answer as contextually as possible.' };
    safeHistory.unshift(systemPrompt);

    // Limit to last 10 messages (excluding system prompt)
    if (safeHistory.length > 11) {
      // Keep system prompt at the start, then last 10
      safeHistory = [systemPrompt, ...safeHistory.slice(-10)];
    }

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
