import axios from 'axios';
import FormData from 'form-data';

const WHISPER_API_KEY = process.env.WHISPER_API_KEY!;

export async function transcribeVoiceWhisper(buffer: Buffer, mime_type: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', buffer, {
    filename: 'voice.ogg',
    contentType: mime_type || 'audio/ogg',
  });
  formData.append('model', 'whisper-1');
  const { data } = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
    headers: {
      'Authorization': `Bearer ${WHISPER_API_KEY}`,
      ...formData.getHeaders(),
    }
  }) as { data: { text: string } };
  return data.text;
}
