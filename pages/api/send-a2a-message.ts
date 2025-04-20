import type { NextApiRequest, NextApiResponse } from 'next';
import { orchestrator } from '../../src/orchestration/orchestratorSingleton';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { from, to, type = 'agent-message', body } = req.body || {};
  if (!from || !to || typeof body === 'undefined') {
    return res.status(400).json({ error: 'Missing required fields: from, to, body' });
  }
  try {
    await orchestrator.sendAgentMessage({
      from,
      to,
      content: body,
      timestamp: Date.now(),
      type
    });
    return res.status(200).json({ status: 'ok' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to send message' });
  }
}
