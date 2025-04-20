export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLM {
  chat(messages: LLMMessage[]): Promise<string>;
}
