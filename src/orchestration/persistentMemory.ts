import { supabase } from '../../utils/supabaseClient';

import { buildModelContext, validateModelContext, ModelContextObject } from '../protocols/modelContextAdapter';

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
    const ctxObj: ModelContextObject = buildModelContext({
      id: record.id || undefined,
      type: record.type,
      version: '1',
      value: {
        content: record.content,
        tags: record.tags,
      },
      provenance: 'persistentMemory',
    });
    await supabase.from(this.table).insert([{ ...ctxObj }]);
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
    // Validate and filter Model Context objects
    return (data || []).filter(validateModelContext);
  }

  /**
   * Get all memory records as Model Context objects (optionally filtered).
   */
  async getAll(): Promise<ModelContextObject[]> {
    const { data, error } = await supabase.from(this.table).select('*').order('createdAt', { ascending: false });
    if (error) throw error;
    return (data || []).filter(validateModelContext);
  }
}

export const persistentMemory = new PersistentMemory();
