export type TelegramText = { chat_id: number | string; text: string };


export interface TelegramFile {
  buffer: Buffer;
  name: string;
  mime: string;
  size: number;
}

export interface Intent {
  kind: 'status' | 'stop' | 'restart' | 'launch' | 'delete' | 'update-config' | 'help' | 'msg';
  agentId?: string;
  launchType?: string;
  config?: Record<string, unknown>;
  message?: string;
}
