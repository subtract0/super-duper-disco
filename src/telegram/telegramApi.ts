import axios from 'axios';
import { TelegramText } from './types';

export class TelegramApi {
  constructor(private readonly token: string) {}

  private url(m: string) {
    return `https://api.telegram.org/bot${this.token}/${m}`;
  }

  async send(msg: TelegramText) {
    await axios.post(this.url('sendMessage'), { chat_id: msg.chat_id, text: msg.text });
  }
}
