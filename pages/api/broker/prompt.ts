// pages/api/broker/prompt.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { insertAgentCard } from '../../../src/orchestration/supabaseAgentCards';

// Simple prompt-to-card logic (expandable with LLM integration)
function parsePromptToCard(prompt: string) {
  // Naive parsing: use prompt as description, generate name/type
  const name = prompt.slice(0, 32) || 'Custom Agent';
  const description = prompt;
  // Normalize prompt: trim, collapse whitespace, lowercase
  const normalized = prompt.trim().replace(/\s+/g, ' ').toLowerCase();
  // Use a stable short hash (SHA-1, first 10 chars)
  const crypto = require('crypto');
  const hash = crypto.createHash('sha1').update(normalized).digest('hex').slice(0, 10);
  const type = `prompt-${hash}`;
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
    // Check for duplicate type before inserting
    const { data: existing, error: fetchError } = await require('../../../utils/supabaseClient').supabase
      .from('agent_idea_cards')
      .select('id')
      .eq('type', cardData.type)
      .maybeSingle();
    if (fetchError) {
      throw new Error(`[prompt] Failed to check for existing agent type: ${fetchError.message}`);
    }
    if (existing) {
      res.status(409).json({ error: `Agent type '${cardData.type}' already exists. Please choose a different prompt or type.` });
      return;
    }
    // Save with ELO 1500
    try {
      const card = await insertAgentCard(cardData);
      res.status(201).json({ ok: true, card });
    } catch (insertErr: any) {
      // Handle Supabase unique constraint error just in case
      if (insertErr.message && insertErr.message.includes('duplicate key')) {
        res.status(409).json({ error: `Agent type '${cardData.type}' already exists. Please choose a different prompt or type.` });
        return;
      }
      throw insertErr;
    }
  } catch (err: any) {
    console.error('[api/broker/prompt] Failed to create card from prompt:', err);
    res.status(500).json({ error: 'Failed to create agent from prompt', details: err?.message || err });
  }
}
