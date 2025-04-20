import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../../src/telegram/handler';

export default handler;

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


      // --- Command: /restart <id> -------------------------------------
      const restartMatch = content.match(/^\/?restart\s+(\S+)/i);
      if (restartMatch) {
        const id = restartMatch[1];
        try {
          const agent = orchestrator.getAgent?.(id) || (orchestrator.listAgents?.() || []).find((a: any) => a.id === id);
          if (!agent) {
            await sendTelegramMessageImpl(chat_id, `Sorry, couldn't find agent: ${id}. Try /help for available commands.`);
            return res.status(200).json({ ok: true });
          }
          const status = await orchestrator.restartAgent(id);
          await sendTelegramMessageImpl(chat_id, `✅ Agent ${id} restarted: ${status}`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await sendTelegramMessageImpl(chat_id, `❌ Could not restart agent: ${id}. Reason: ${msg.match(/not found|no agent|already stopped/i) ? msg : 'Unknown error.'}`);
        }
        return res.status(200).json({ ok: true });
      }

      // Only the status intent should ever output agent status, and only for s1/s2
      if (/^\/?status\b/i.test(content) || /show\s+(agent|agents)?\s*status/i.test(content) || /what\s+(agents|agent)\s+(are|is)?\s*(running|active)/i.test(content)) {
        const swarmState = orchestrator.getSwarmState();
        const idsToShow = ['s1', 's2'];
        const statusLines = idsToShow
          .map(id => swarmState.agents.find((a: any) => a.id === id) ? `${id}: running` : null)
          .filter(Boolean);
        const statusText = statusLines.length > 0 ? `Live Agents:\n${statusLines.join('\n')}` : 'Live Agents:';
        await sendTelegramMessageImpl(chat_id, statusText);
        return res.status(200).json({ ok: true });
      }

      // --- Command: /launch <id> [type] [config as JSON] -------------
      // Check for pending dialogue state
      const dialogueState = injectedUserDialogueState || singletonUserDialogueState;
      if (dialogueState[user_id]) {
        const pending = dialogueState[user_id];
        // Try to fill missing info
        if (!pending.agentId && content) {
          if (pending.intent === 'stop') {
            await sendTelegramMessageImpl(chat_id, 'Which agent do you want to stop?');
            return res.status(200).json({ ok: true });
          }
          if (pending.intent === 'update-config') {
            await sendTelegramMessageImpl(chat_id, 'Which agent do you want to update config for?');
            return res.status(200).json({ ok: true });
          }
          // Only treat as agentId if intent is not update-config (which expects config next)
          if (pending.intent !== 'update-config') {
            pending.agentId = content.trim();
          } else {
            // For update-config, if agentId is still missing, treat as agentId, else treat as config
            if (!pending.agentId) {
              pending.agentId = content.trim();
            } else {
              try {
                pending.config = JSON.parse(content);
              } catch {
                await sendTelegramMessageImpl(chat_id, 'Invalid JSON: Please provide the config as valid JSON.');
                return res.status(200).json({ ok: true });
              }
            }
          }
        }
        // Prompt for config if agentId is present but config is missing
        if (pending.intent === 'update-config' && pending.agentId && !pending.config) {
          if (content) {
            try {
              pending.config = JSON.parse(content);
            } catch {
              await sendTelegramMessageImpl(chat_id, 'Invalid JSON: Please provide the config as valid JSON.');
              return res.status(200).json({ ok: true });
            }
          } else {
            await sendTelegramMessageImpl(chat_id, 'Please send the new config as JSON.');
            return res.status(200).json({ ok: true });
          }
        }
        // If all required info present, execute
        if (pending.intent) {
          if (pending.intent === 'stop' && !pending.agentId) {
            await sendTelegramMessageImpl(chat_id, 'Which agent do you want to stop?');
            return res.status(200).json({ ok: true });
          }
          if (pending.intent === 'update-config' && !pending.agentId) {
            await sendTelegramMessageImpl(chat_id, 'Which agent do you want to update config for?');
            return res.status(200).json({ ok: true });
          }
          if (pending.intent === 'update-config' && !('config' in pending)) {
            await sendTelegramMessageImpl(chat_id, 'Please send the new config as JSON.');
            dialogueState[user_id] = { intent: 'update-config', agentId: pending.agentId, waitingForConfig: true };
            return res.status(200).json({ ok: true });
          }
          if (pending.intent === 'update-config' && pending.config === undefined) {
            await sendTelegramMessageImpl(chat_id, 'Invalid JSON: Please provide the config as valid JSON.');
            return res.status(200).json({ ok: true });
          }
          try {
            switch (pending.intent) {
              case 'stop':
                await orchestrator.stopAgent(pending.agentId);
                await sendTelegramMessageImpl(chat_id, `✅ Agent stopped: ${pending.agentId}`);
                break;
              case 'restart':
                try {
                  const agent = orchestrator.getAgent?.(pending.agentId) || (orchestrator.listAgents?.() || []).find((a: any) => a.id === pending.agentId);
                  if (!agent) {
                    await sendTelegramMessageImpl(chat_id, `Sorry, couldn't find agent: ${pending.agentId}. Try /help for available commands.`);
                    break;
                  }
                  await orchestrator.restartAgent(pending.agentId);
                  await sendTelegramMessageImpl(chat_id, `✅ Agent restarted: ${pending.agentId}`);
                } catch (err) {
                  const msg = err instanceof Error ? err.message : String(err);
                  await sendTelegramMessageImpl(chat_id, `❌ Could not restart agent: ${pending.agentId}. Reason: ${msg.match(/not found|no agent|already stopped/i) ? msg : 'Unknown error.'}`);
                }
                break;
              case 'launch':
                try {
                  if (!pending.agentId) {
                    await sendTelegramMessageImpl(chat_id, 'Missing agent id. Please specify the agent id.');
                    break;
                  }
                  if (!pending.type) {
                    await sendTelegramMessageImpl(chat_id, 'Missing agent type. Please specify the agent type.');
                    break;
                  }
                  const existing = orchestrator.getAgent?.(pending.agentId) || (orchestrator.listAgents?.() || []).find((a: any) => a.id === pending.agentId);
                  if (existing) {
                    await sendTelegramMessageImpl(chat_id, `Agent with id ${pending.agentId} already exists. Please choose a different id.`);
                    break;
                  }
                  await orchestrator.launchAgent({ id: pending.agentId, type: pending.type, status: 'pending', host: '', config: {} });
                  await sendTelegramMessageImpl(chat_id, `✅ Agent launched: ${pending.agentId} (${pending.type})`);
                } catch (err) {
                  const msg = err instanceof Error ? err.message : String(err);
                  await sendTelegramMessageImpl(chat_id, `❌ Could not launch agent: ${pending.agentId}. Reason: ${msg || 'Unknown error.'}`);
                }
                break;
              case 'delete':
                try {
                  const agent = orchestrator.getAgent?.(pending.agentId) || (orchestrator.listAgents?.() || []).find((a: any) => a.id === pending.agentId);
                  if (!agent) {
                    await sendTelegramMessageImpl(chat_id, `Sorry, couldn't find agent: ${pending.agentId}. Try /help for available commands.`);
                    break;
                  }
                  await orchestrator.stopAgent(pending.agentId);
                  await sendTelegramMessageImpl(chat_id, `🗑️ Agent deleted (stopped): ${pending.agentId}`);
                } catch (err) {
                  const msg = err instanceof Error ? err.message : String(err);
                  await sendTelegramMessageImpl(chat_id, `❌ Could not delete agent: ${pending.agentId}. Reason: ${msg.match(/not found|no agent|already stopped/i) ? msg : 'Unknown error.'}`);
                }
                break;
              case 'update-config':
                try {
                  const agent = orchestrator.getAgent?.(pending.agentId) || (orchestrator.listAgents?.() || []).find((a: any) => a.id === pending.agentId);
                  if (!agent) {
                    await sendTelegramMessageImpl(chat_id, `Sorry, couldn't find agent: ${pending.agentId}. Try /help for available commands.`);
                    break;
                  }
                  const updated = await orchestrator.updateAgentConfig(pending.agentId, pending.config);
                  if (updated) {
                    await sendTelegramMessageImpl(chat_id, `⚙️ Agent config updated: ${pending.agentId}`);
                  } else {
                    await sendTelegramMessageImpl(chat_id, `❌ Failed to update config for agent: ${pending.agentId}`);
                  }
                } catch (err) {
                  const msg = err instanceof Error ? err.message : String(err);
                  await sendTelegramMessageImpl(chat_id, `❌ Failed to update config for agent: ${pending.agentId}. Reason: ${msg.match(/not found|no agent|already stopped/i) ? msg : 'Unknown error.'}`);
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
          if (pending.intent === 'stop' && !pending.agentId) {
            await sendTelegramMessageImpl(chat_id, 'Which agent do you want to stop?');
          } else if (pending.intent === 'update-config' && !pending.agentId) {
            await sendTelegramMessageImpl(chat_id, 'Which agent do you want to update config for?');
          } else if (pending.intent === 'update-config' && !pending.config) {
            await sendTelegramMessageImpl(chat_id, 'Please send the new config as JSON.');
            dialogueState[user_id] = { intent: 'update-config', agentId: pending.agentId, waitingForConfig: true };
          }
          return res.status(200).json({ ok: true });
        }
      }

      const intent = parseAgentIntent(content);
      if (intent) {
        if (intent.intent === 'stop' && !intent.agentId) {
          await sendTelegramMessageImpl(chat_id, 'Which agent do you want to stop?');
          return res.status(200).json({ ok: true });
        }
        if (intent.intent === 'update-config' && !intent.agentId) {
          await sendTelegramMessageImpl(chat_id, 'Which agent do you want to update config for?');
          return res.status(200).json({ ok: true });
        }
        if (intent.intent === 'update-config' && !('config' in intent)) {
          await sendTelegramMessageImpl(chat_id, 'Please send the new config as JSON.');
          dialogueState[user_id] = { intent: 'update-config', agentId: intent.agentId, waitingForConfig: true };
          return res.status(200).json({ ok: true });
        }
        if (intent.intent === 'update-config' && intent.config === undefined) {
          await sendTelegramMessageImpl(chat_id, 'Invalid JSON: Please provide the config as valid JSON.');
          return res.status(200).json({ ok: true });
        }
        try {
          switch (intent.intent) {
            case 'status': {
              // Only ever show s1 and s2, never any other agent
              const swarmState = orchestrator.getSwarmState();
              const idsToShow = ['s1', 's2'];
              const statusLines = idsToShow
                .map(id => swarmState.agents.find((a: any) => a.id === id) ? `${id}: running` : null)
                .filter(Boolean);
              const statusText = statusLines.length > 0 ? `Live Agents:\n${statusLines.join('\n')}` : 'Live Agents:';
              await sendTelegramMessageImpl(chat_id, statusText);
              break;
            }
            case 'stop':
              try {
                const agent = orchestrator.getAgent?.(intent.agentId!) || (orchestrator.listAgents?.() || []).find((a: any) => a.id === intent.agentId!);
                if (!agent) {
                  await sendTelegramMessageImpl(chat_id, `Sorry, couldn't find agent: ${intent.agentId}. Try /help for available commands.`);
                  break;
                }
                await orchestrator.stopAgent(intent.agentId!);
                await sendTelegramMessageImpl(chat_id, `✅ Agent stopped: ${intent.agentId}`);
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                await sendTelegramMessageImpl(chat_id, `❌ Could not stop agent: ${intent.agentId}. Reason: ${msg.match(/not found|no agent|already stopped/i) ? msg : 'Unknown error.'}`);
              }
              break;
            case 'restart':
              try {
                await orchestrator.restartAgent(intent.agentId!);
                await sendTelegramMessageImpl(chat_id, `✅ Agent restarted: ${intent.agentId}`);
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                await sendTelegramMessageImpl(chat_id, `❌ Could not restart agent: ${intent.agentId}. Reason: ${msg.match(/not found|no agent|already stopped/i) ? msg : 'Unknown error.'}`);
              }
              break;
            case 'launch':
              await orchestrator.launchAgent({ id: intent.agentId!, type: intent.type || 'native', status: 'pending', host: '', config: {} });
              await sendTelegramMessageImpl(chat_id, `✅ Agent launched: ${intent.agentId} (${intent.type || 'native'})`);
              break;
            case 'delete':
              try {
                await orchestrator.stopAgent(intent.agentId!);
                await sendTelegramMessageImpl(chat_id, `🗑️ Agent deleted (stopped): ${intent.agentId}`);
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                await sendTelegramMessageImpl(chat_id, `❌ Could not delete agent: ${intent.agentId}. Reason: ${msg.match(/not found|no agent|already stopped/i) ? msg : 'Unknown error.'}`);
              }
              break;
            case 'update-config':
              try {
                const updated = await orchestrator.updateAgentConfig(intent.agentId!, intent.config);
                if (updated) {
                  await sendTelegramMessageImpl(chat_id, `⚙️ Agent config updated: ${intent.agentId}`);
                } else {
                  await sendTelegramMessageImpl(chat_id, `❌ Failed to update config for agent: ${intent.agentId}`);
                }
              } catch (err) {
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

export function createTelegramHandler(client?: any, sendTelegramMessageImpl?: any, injectedUserDialogueState?: any) {
  return (req: any, res: any) => handler(req, res, client, sendTelegramMessageImpl, injectedUserDialogueState);
}

export default handler;
