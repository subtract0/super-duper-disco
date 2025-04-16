import type { NextApiRequest, NextApiResponse } from "next";
import { orchestrator } from "./index";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    res.status(400).json({ error: 'Invalid agent id (must be string)' });
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const result = await orchestrator.restartAgent(id);
    res.status(200).json({ ok: true, result });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to restart agent' });
  }
}
