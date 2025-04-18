// pages/api/broker/prompt.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { insertAgentCard } from '../../../src/orchestration/supabaseAgentCards';

// Simple prompt-to-card logic (expandable with LLM integration)
function parsePromptToCard(prompt: string) {
  // Naive parsing: use prompt as description, generate name/type
  const name = prompt.slice(0, 32) || 'Custom Agent';
  const description = prompt;
  // Use a static type for SSR hydration safety
  const type = 'custom-prompt';
  return { name, description, image: '/card-art-fallback.png', type };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string' || prompt.length < 5) {
    res.status(400).json({ error: 'Prompt too short' });
    return;
  }
  try {
    const cardData = parsePromptToCard(prompt);
    // Save with ELO 1500
    const card = await insertAgentCard(cardData);
    res.status(201).json({ ok: true, card });
  } catch (err: any) {
    console.error('[api/broker/prompt] Failed to create card from prompt:', err);
    res.status(500).json({ error: 'Failed to create agent from prompt', details: err?.message || err });
  }
}
