// mcpAdapter.ts
// Adapter for building and parsing Model Context Protocol (MCP) message envelopes

export type MCPEnvelope = {
  id: string;
  type: string; // e.g., 'fetch', 'update', 'subscribe', 'broadcast', etc.
  from: string;
  to: string;
  protocol: 'MCP';
  createdAt: number;
  version?: string; // for context versioning
  body: any; // context payload or operation
  threadId?: string;
  signature?: string;
};

import { v4 as uuidv4 } from 'uuid';

/**
 * Build an MCP protocol-compliant message envelope
 */
export function buildMCPEnvelope({
  type,
  from,
  to,
  body,
  threadId,
  version,
  signature,
}: {
  type: string;
  from: string;
  to: string;
  body: any;
  threadId?: string;
  version?: string;
  signature?: string;
}): MCPEnvelope {
  return {
    id: uuidv4(),
    type,
    from,
    to,
    protocol: 'MCP',
    createdAt: Date.now(),
    version,
    body,
    threadId,
    signature,
  };
}

/**
 * Parse and validate an MCP envelope
 */
export function parseMCPEnvelope(env: any): MCPEnvelope | null {
  if (
    env &&
    typeof env.id === 'string' &&
    typeof env.type === 'string' &&
    typeof env.from === 'string' &&
    typeof env.to === 'string' &&
    env.protocol === 'MCP' &&
    typeof env.createdAt === 'number' &&
    env.body !== undefined
  ) {
    return env as MCPEnvelope;
  }
  return null;
}
