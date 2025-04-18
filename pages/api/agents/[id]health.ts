import type { NextApiRequest, NextApiResponse } from "next";
import { orchestrator } from '../../../src/orchestration/orchestratorSingleton';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    res.status(400).json({ error: 'Invalid agent id (must be string)' });
    return;
  }
  if (req.method === "GET") {
    const status = orchestrator.getHealth(id);
    res.status(200).json({ status });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
