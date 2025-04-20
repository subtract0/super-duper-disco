// src/llm/llmTool.ts
// Refactored: Only re-export getLLM from factory, no side-effects, no top-level logs.
import { getLLM } from './factory';
export { getLLM };
