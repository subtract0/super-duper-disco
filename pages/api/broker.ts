// pages/api/broker.ts
// API route for Agent Broker: suggests agent ideas and deploys on selection.
import type { NextApiRequest, NextApiResponse } from 'next';
import { AgentOrchestrator } from '../../src/orchestration/agentOrchestrator';
import { AgentBroker } from '../../src/orchestration/agentBroker';

const orchestrator = new AgentOrchestrator();
const broker = new AgentBroker(orchestrator);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // If ?history=1, return deployment history
    if (req.query.history === '1') {
      const history = broker.getDeploymentHistory(20);
      res.status(200).json({ history });
      return;
    }
    // Otherwise, suggest 2-3 agent ideas as cards
    const n = Math.max(2, Math.min(3, Number(req.query.n) || 3));
    try {
      const ideas = await broker.suggestIdeas(n);
      res.status(200).json({ cards: ideas });
    } catch (err: any) {
      console.error('[api/broker] Failed to fetch agent ideas:', err);
      res.status(500).json({ error: 'Failed to fetch agent ideas', details: err?.message || err });
    }
    return;
  }
  if (req.method === 'POST') {
    // Deploy the selected agent idea card and update ELO learning
    const { card, host, shownCardIds } = req.body;
    if (!card || !card.config || !card.config.type) {
      res.status(400).json({ error: 'Invalid card data' });
      return;
    }
    try {
      const agent = await broker.deployIdea(card, host || 'default');
      // ELO learning if shownCardIds provided
      if (Array.isArray(shownCardIds) && shownCardIds.length > 1 && card.id) {
        await broker.updateEloLearning(card.id, shownCardIds);
      }
      res.status(201).json({ ok: true, agent });
    } catch (e: any) {
      console.error('[api/broker] Failed to deploy agent:', e);
      res.status(500).json({ error: e.message || 'Failed to deploy agent' });
    }
    return;
  }
  res.status(405).json({ error: 'Method not allowed' });
}
