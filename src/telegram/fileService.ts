import axios from 'axios';
import type { SupabaseClient } from '@supabase/supabase-js';
import { TelegramFile } from './types';

export class FileService {
  constructor(
    private readonly botToken: string,
    private readonly supabase: SupabaseClient,
    private readonly bucket = 'telegram'
  ) {}

  private api(method: string) {
    return `https://api.telegram.org/bot${this.botToken}/${method}`;
  }

  async download(id: string): Promise<TelegramFile> {
    const { data: { result } } = await axios.get(this.api('getFile'), { params: { file_id: id } });
    const filePath = result.file_path;

    const resp = await axios.get(`https://api.telegram.org/file/bot${this.botToken}/${filePath}`, { responseType: 'arraybuffer' });
    return {
      buffer: Buffer.from(resp.data),
      name: filePath.split('/').pop() || 'file',
      mime: resp.headers['content-type'],
      size: Number(resp.headers['content-length']),
    };
  }

  async upload(f: TelegramFile): Promise<string> {
    const { data, error } = await this.supabase.storage.from(this.bucket).upload(f.name, f.buffer, { contentType: f.mime });
    if (error) throw error;
    return `${this.supabase.storageUrl}/${this.bucket}/${data.path}`;
  }
}
