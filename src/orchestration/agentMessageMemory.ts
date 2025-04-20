import { supabase } from '../../utils/supabaseClient';
import { supabaseServer } from '../../utils/supabaseServerClient';
import { buildModelContext, validateModelContext, ModelContextObject } from '../protocols/modelContextAdapter';
import { buildMCPEnvelope, parseMCPEnvelope, MCPEnvelope } from '../protocols/mcpAdapter';

export type AgentMessageRecord = {
  id?: string;
  type: string; // e.g., 'chat', 'system', 'context'
  content: string;
  role: string; // 'user' | 'agent' | 'system'
  tags?: string[];
  provenance?: string;
  thread_id?: string;
  user_id?: string;
  agent_id?: string;
  created_at?: string;
  updated_at?: string;
};

export class AgentMessageMemory {
  private table = 'agent_messages';

  /**
   * Save a message as a Model Context Protocol envelope to Supabase.
   */
  async save(record: AgentMessageRecord): Promise<void> {
    // Always provide a valid UUID for id (Supabase requires non-null UUID PK)
    let id = record.id;
    if (!id || typeof id !== 'string' || id.trim() === '') {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        id = crypto.randomUUID();
      } else {
        // Fallback simple UUID v4 generator
        id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      }
    }
    const ctxObjInput: any = {
      id,
      type: record.type,
      version: '1',
      value: {
        content: record.content,
        role: record.role,
        tags: record.tags,
      },
      provenance: record.provenance || 'telegram',
      thread_id: record.thread_id,
      user_id: record.user_id,
      agent_id: record.agent_id,
    };
    const ctxObj: ModelContextObject = buildModelContext(ctxObjInput as any);

    const mcpEnvelope: MCPEnvelope = buildMCPEnvelope({
      type: 'update',
      from: record.provenance || 'telegram',
      to: 'supabase',
      body: ctxObj,
    });
    // Remove 'access', 'createdAt', and 'updatedAt' properties if present (Supabase schema does not allow them)
    if ('access' in mcpEnvelope.body) {
      delete mcpEnvelope.body['access'];
    }
    if ('createdAt' in mcpEnvelope.body) {
      delete mcpEnvelope.body['createdAt'];
    }
    if ('updatedAt' in mcpEnvelope.body) {
      delete mcpEnvelope.body['updatedAt'];
    }
    // [AgentMessageMemory.save] Insert MCP envelope (info log suppressed for production cleanliness)
    const { data, error } = await supabaseServer.from(this.table)
      .insert([
        {
          ...mcpEnvelope.body,
          thread_id: record.thread_id,
          user_id: record.user_id,
          agent_id: record.agent_id
        }
      ]);
    if (error) {
      console.error('[AgentMessageMemory.save] Supabase insert error:', error, '\nMessage:', mcpEnvelope.body);
      throw new Error(`[AgentMessageMemory.save] Supabase error: ${typeof error === 'object' && error.message ? error.message : JSON.stringify(error)} (MCP envelope: ${JSON.stringify(mcpEnvelope.body)})`);
    }
    if (!data) {
      console.warn('[AgentMessageMemory.save] Supabase insert returned no data.', { mcpEnvelope: mcpEnvelope.body });
    }
  }

  /**
   * Fetch the last N messages for a thread/user as Model Context objects.
   */
  async fetchRecent({ thread_id, user_id, limit = 10 }: { thread_id?: string; user_id?: string; limit?: number }): Promise<ModelContextObject[]> {
    // Force thread_id to string if present
    if (thread_id && typeof thread_id !== 'string') thread_id = String(thread_id);
    if (user_id && typeof user_id !== 'string') user_id = String(user_id);
    // [AgentMessageMemory.fetchRecent] Fetching recent messages (debug log suppressed for production cleanliness)
    let q = supabaseServer.from(this.table).select('*');
    if (thread_id) q = q.eq('thread_id', thread_id);
    if (user_id) q = q.eq('user_id', user_id);
    q = q.order('created_at', { ascending: false }).limit(limit);
    const response = await q;
    const data = response && typeof response === 'object' ? response.data : undefined;
    const error = response && typeof response === 'object' ? response.error : undefined;
    console.log('[AgentMessageMemory.fetchRecent] Supabase response:', { data, error });
    if (error) {
      console.error('[AgentMessageMemory.fetchRecent] Supabase fetch error:', error, '\nParams:', { thread_id, user_id, limit });
      throw new Error(`[AgentMessageMemory.fetchRecent] Supabase error: ${typeof error === 'object' && error.message ? error.message : JSON.stringify(error)} (Params: ${JSON.stringify({ thread_id, user_id, limit })})`);
    }
    if (!Array.isArray(data) || data.length === 0) {
      console.warn('[AgentMessageMemory.fetchRecent] Supabase fetch returned no data or malformed data.', { thread_id, user_id, limit, data });
      // Fallback: fetch all rows for this thread_id for debugging
      if (thread_id) {
        const allRows = await supabaseServer.from(this.table).select('*').eq('thread_id', thread_id);
        console.warn('[AgentMessageMemory.fetchRecent] Fallback: All rows for thread_id', thread_id, allRows.data);
      }
      return [];
    }
    // TEMP: Bypass parseMCPEnvelope, just return row as body for memory to work
const parsed = (data || []).map((row: any, idx: number) => {
        // [AgentMessageMemory.fetchRecent] Row before parse (debug log suppressed)
        if (row.value && typeof row.value === 'string') {
          try { row.value = JSON.parse(row.value); } catch (e) {
            console.warn('[AgentMessageMemory.fetchRecent] Failed to parse value as JSON:', row.value, e);
          }
        }
        // Bypass MCP parsing for now
        const env = { body: row };
        // [AgentMessageMemory.fetchRecent] Row after MCP bypass (debug log suppressed)
        return env;
      })
      .filter((env: any) => !!env.body && typeof env.body.value?.role === 'string')
      .map((env) => env.body);
// [AgentMessageMemory.fetchRecent] Returning parsed array (debug log suppressed)
return parsed;
  }
}

export const agentMessageMemory = new AgentMessageMemory();
