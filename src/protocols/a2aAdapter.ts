// a2aAdapter.ts
// Adapter for building and parsing A2A protocol message envelopes

export type A2AEnvelope = {
  id: string;
  type: string; // e.g., 'task', 'status', 'control', etc.
  from: string;
  to: string;
  threadId?: string;
  protocol: 'A2A';
  createdAt: number;
  body: any;
  signature?: string;
};

import { v4 as uuidv4 } from 'uuid';

/**
 * Build an A2A protocol-compliant message envelope
 */
export function buildA2AEnvelope({
  type,
  from,
  to,
  body,
  threadId,
  signature,
}: {
  type: string;
  from: string;
  to: string;
  body: any;
  threadId?: string;
  signature?: string;
}): A2AEnvelope {
  return {
    id: uuidv4(),
    type,
    from,
    to,
    threadId,
    protocol: 'A2A',
    createdAt: Date.now(),
    body,
    signature,
  };
}

/**
 * Parse and validate an A2A envelope
 */
export function parseA2AEnvelope(msg: any): A2AEnvelope {
  if (!msg || msg.protocol !== 'A2A') throw new Error('Not an A2A message');
  // Optionally: verify signature, check required fields
  return msg as A2AEnvelope;
}
