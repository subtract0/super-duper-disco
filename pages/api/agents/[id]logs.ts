import type { NextApiRequest, NextApiResponse } from "next";
import { agentLogStore } from '../../../src/orchestration/agentLogs';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    res.status(400).json({ error: 'Invalid agent id (must be string)' });
    return;
  }
  if (req.method === "GET") {
    const logs = agentLogStore.getRecentLogs(id, 50);
    res.status(200).json({ logs });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
