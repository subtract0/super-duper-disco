import type { NextApiRequest, NextApiResponse } from 'next';
import { orchestrator } from '../../src/orchestration/orchestratorSingleton';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { action, id } = req.body || {};
  if (!action || !id) {
    return res.status(400).json({ error: 'Missing action or id' });
  }
  try {
    if (action === 'restart') {
      await orchestrator.restartAgent(id);
      return res.status(200).json({ status: 'restarted' });
    }
    if (action === 'stop') {
      await orchestrator.stopAgent(id);
      return res.status(200).json({ status: 'stopped' });
    }
    return res.status(400).json({ error: 'Unknown action' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to control agent' });
  }
}
