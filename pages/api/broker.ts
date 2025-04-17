// pages/api/broker.ts
// API route for Agent Broker: suggests agent ideas and deploys on selection.
import type { NextApiRequest, NextApiResponse } from 'next';
import { AgentOrchestrator } from '../../src/orchestration/agentOrchestrator';
import { AgentBroker } from '../../src/orchestration/agentBroker';

const orchestrator = new AgentOrchestrator();
const broker = new AgentBroker(orchestrator);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Suggest 2-3 agent ideas as cards
    const n = Math.max(2, Math.min(3, Number(req.query.n) || 3));
    const ideas = await broker.suggestIdeas(n);
    res.status(200).json({ cards: ideas });
    return;
  }
  if (req.method === 'POST') {
    // Deploy the selected agent idea card
    const { card, host } = req.body;
    if (!card || !card.config || !card.config.type) {
      res.status(400).json({ error: 'Invalid card data' });
      return;
    }
    try {
      const agent = await broker.deployIdea(card, host || 'default');
      res.status(201).json({ ok: true, agent });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to deploy agent' });
    }
    return;
  }
  res.status(405).json({ error: 'Method not allowed' });
}
