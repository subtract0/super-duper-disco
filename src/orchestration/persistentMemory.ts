import { supabase } from '../../utils/supabaseClient';

import { buildModelContext, validateModelContext, ModelContextObject } from '../protocols/modelContextAdapter';
import { buildMCPEnvelope, parseMCPEnvelope, MCPEnvelope } from '../protocols/mcpAdapter';

export type PersistentMemoryRecord = {
  id?: string;
  type: string; // e.g., 'learning', 'pitfall', 'env', etc.
  content: string;
  tags?: string[];
  created_at?: string;
};

export class PersistentMemory {
  private table = 'persistent_memory';

  /**
   * Save a memory record as a Model Context Protocol object to Supabase.
   */
  async save(record: PersistentMemoryRecord): Promise<void> {
    // Build a Model Context object
    // Build a Model Context object and wrap in MCP envelope
    const ctxObj: ModelContextObject = buildModelContext({
      id: record.id || "",
      type: record.type,
      version: '1',
      value: {
        content: record.content,
        tags: record.tags,
      },
      provenance: 'persistentMemory',
    });
    const mcpEnvelope: MCPEnvelope = buildMCPEnvelope({
      type: 'update',
      from: 'persistentMemory',
      to: 'supabase',
      body: ctxObj,
    });
    await supabase.from(this.table).insert([{ ...mcpEnvelope.body }]);
  }

  /**
   * Query memory records by type or tag (returns Model Context objects)
   */
  async query(params: { type?: string; tag?: string }): Promise<ModelContextObject[]> {
    let q = supabase.from(this.table).select('*');
    if (params.type) q = q.eq('type', params.type);
    if (params.tag) q = q.contains('value->tags', [params.tag]);
    const { data, error } = await q;
    if (error) throw error;
    // Parse as MCP envelopes, extract context, and validate
    return (data || [])
      .map((row: any) => parseMCPEnvelope({ ...row, protocol: 'MCP', body: row }))
      .filter((env: MCPEnvelope | null): env is MCPEnvelope => !!env && validateModelContext(env.body))
      .map((env) => env.body);
  }

  /**
   * Get all memory records as Model Context objects (optionally filtered).
   */
  async getAll(): Promise<ModelContextObject[]> {
    const { data, error } = await supabase.from(this.table).select('*').order('createdAt', { ascending: false });
    if (error) throw error;
    // Parse as MCP envelopes, extract context, and validate
    return (data || [])
      .map((row: any) => parseMCPEnvelope({ ...row, protocol: 'MCP', body: row }))
      .filter((env: MCPEnvelope | null): env is MCPEnvelope => !!env && validateModelContext(env.body))
      .map((env) => env.body);
  }
}

export const persistentMemory = new PersistentMemory();
