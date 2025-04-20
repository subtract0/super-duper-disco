import 'openai/shims/node';
import type { LLM } from './types';
import { OpenAILLM } from './providers/openai';

const cache: Record<string, LLM> = {};

export function getLLM(provider: string = 'openai'): LLM {
  if (cache[provider]) return cache[provider];
  let instance: LLM;
  switch (provider) {
    case 'openai':
    default:
      instance = new OpenAILLM();
      break;
    /* case 'azure':
       instance = new AzureLLM();
       break; */
  }
  cache[provider] = instance;
  return instance;
}
