// API route to trigger a test error for Sentry
import type { NextApiRequest, NextApiResponse } from 'next';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function handler(_req: NextApiRequest, _res: NextApiResponse) {
  throw new Error('Sentry test error: This is a test error for Sentry integration.');
}
