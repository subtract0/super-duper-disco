import { supabase } from '../../utils/supabaseClient';

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
   * Save a memory record to Supabase.
   */
  async save(record: PersistentMemoryRecord): Promise<void> {
    await supabase.from(this.table).insert([{ ...record }]);
  }

  /**
   * Query memory records by type or tag.
   */
  async query(params: { type?: string; tag?: string }): Promise<PersistentMemoryRecord[]> {
    let q = supabase.from(this.table).select('*');
    if (params.type) q = q.eq('type', params.type);
    if (params.tag) q = q.contains('tags', [params.tag]);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }

  /**
   * Get all memory records (optionally filtered).
   */
  async getAll(): Promise<PersistentMemoryRecord[]> {
    const { data, error } = await supabase.from(this.table).select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }
}

export const persistentMemory = new PersistentMemory();
