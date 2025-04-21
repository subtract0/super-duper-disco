/* OpenAI provider – uses @langchain/openai */

import 'openai/shims/node';
import { ChatOpenAI } from '@langchain/openai';
import { LLM, LLMMessage } from '../types';

/* Patch only in non‑prod environments; avoids global side‑effects in prod */
if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('openai/shims/node');
}

export class OpenAILLM implements LLM {
  private model: ChatOpenAI;

  constructor(
    private readonly apiKey  = process.env.OPENAI_API_KEY ?? '',
    private readonly modelId = process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    private readonly temperature = 0.2,
    private readonly maxTokens   = 1024,
  ) {
    if (!apiKey) throw new Error('OPENAI_API_KEY not set');
    this.model = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName   : modelId,
      temperature ,
      maxTokens   ,
    });
  }

  async chat(messages: LLMMessage[]): Promise<string> {
    const formatted = messages.map(m => ({ role: m.role, content: m.content }));
    const res       = await this.model.invoke(formatted);
    return typeof res.content === 'string' ? res.content : '';
  }
}
