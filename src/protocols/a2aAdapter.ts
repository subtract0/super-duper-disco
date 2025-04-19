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
  version?: string; // protocol version, optional for backward compatibility
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
  version = '1',
}: {
  type: string;
  from: string;
  to: string;
  body: any;
  threadId?: string;
  signature?: string;
  version?: string;
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
    version,
  };
}

/**
 * Parse and validate an A2A envelope
 * Returns the envelope and protocol version (defaults to '1' if missing)
 */
export function parseA2AEnvelope(msg: any): A2AEnvelope {
  if (!msg || msg.protocol !== 'A2A') throw new Error('Not an A2A message');
  // Optionally: verify signature, check required fields
  if (!msg.version) msg.version = '1';
  return msg as A2AEnvelope;
}

/**
 * Negotiate protocol version between two agents (returns agreed version or lowest)
 */
export function negotiateA2AVersion(agentVersionA?: string, agentVersionB?: string): string {
  // For now, use the lowest version (string compare, assuming '1', '2', ...)
  if (!agentVersionA && !agentVersionB) return '1';
  if (!agentVersionA) return agentVersionB!;
  if (!agentVersionB) return agentVersionA;
  return agentVersionA < agentVersionB ? agentVersionA : agentVersionB;
}

