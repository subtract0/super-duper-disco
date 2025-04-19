// src/llm/llmTool.ts
console.log('[OpenAILLM][BOOT] llmTool.ts loaded at', new Date().toISOString());
// Flexible LLM integration module for agent and orchestrator use
// Supports quick switching of models/providers (OpenAI, Azure, Anthropic, local, etc.)
// Usage: import { getLLM } from './llmTool'; const llm = getLLM('openai'); await llm.chat(messages);

import { ChatOpenAI } from '@langchain/openai';
// import { AzureOpenAI } from 'langchain/llms/azure';
// import { Anthropic } from 'langchain/llms/anthropic';
// Add more providers as needed

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLM {
  chat(messages: LLMMessage[]): Promise<string>;
}

class OpenAILLM implements LLM {
  private model: ChatOpenAI;
  constructor() {
    this.model = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: process.env.OPENAI_MODEL || 'gpt-4',
      temperature: 0.2,
      maxTokens: 1024,
    });
  }
  async chat(messages: LLMMessage[]): Promise<string> {
    // Log the model name for debugging purposes
    // @ts-ignore
    const modelName = this.model.modelName || (this.model as any).modelName || process.env.OPENAI_MODEL || 'unknown';
    console.log(`[OpenAILLM] Using model: ${modelName}`);
    const formatted = messages.map((m) => ({ role: m.role, content: m.content }));
    const res = await this.model.invoke(formatted);
    return (res && typeof res.content === 'string') ? res.content : '';
  }
}

export function getLLM(provider: string = 'openai'): LLM {
  switch (provider) {
    case 'openai':
    default:
      return new OpenAILLM();
  }
}


// Add more LLM classes here (AzureOpenAI, Anthropic, etc.)
