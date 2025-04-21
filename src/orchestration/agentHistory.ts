/**
 * agentHistory.ts
 * Simple in-memory deployment history store for agents. Future: Replace with persistent storage.
 */

export type AgentDeploymentRecord = {
  agentId: string;
  cardName: string;
  timestamp: number;
  host: string;
  config: Record<string, unknown>;
};

import { supabase } from '../utils/supabaseClient';
import { buildModelContext, validateModelContext, ModelContextObject } from '../protocols/modelContextAdapter';
import { buildMCPEnvelope, parseMCPEnvelope, MCPEnvelope } from '../protocols/mcpAdapter';

type AgentDeploymentRow = {
  id: string;
  createdAt?: string;
  type?: string;
  value: unknown;
  [key: string]: unknown;
};

export class AgentHistoryStore {
  /**
   * API compatibility: get deployments by agent as a method
   */
  getDeploymentsByAgent(agentId: string, limit = 20): Promise<ModelContextObject[]> {
    return this.getDeployments(limit, agentId);
  }

  private table = 'agent_deployments';

  /**
   * Save a deployment record as a Model Context Protocol envelope to Supabase.
   */
  async save(record: AgentDeploymentRecord): Promise<void> {
    const ctxObj: ModelContextObject = buildModelContext({
      id: `${record.agentId}-${record.timestamp}`,
      type: 'deployment',
      version: '1',
      value: record,
      provenance: 'agentHistory',
    });
    const mcpEnvelope: MCPEnvelope = buildMCPEnvelope({
      type: 'update',
      from: 'agentHistory',
      to: 'supabase',
      body: ctxObj,
    });
    await supabase.from(this.table).insert([{ ...mcpEnvelope.body }]);
  }

  /**
   * Get the most recent deployments (optionally filtered by agentId).
   */
  async getDeployments(limit: number = 20, agentId?: string): Promise<ModelContextObject[]> {
    let q = supabase.from(this.table).select('*').order('createdAt', { ascending: false }).limit(limit);
    if (agentId) q = q.eq('value->agentId', agentId);
    const { data, error } = await q;
    if (error) throw error;
    return (data || [])
      .map((row: AgentDeploymentRow) => parseMCPEnvelope({ ...row, protocol: 'MCP', body: row }))
      .filter((env: MCPEnvelope | null): env is MCPEnvelope => !!env && validateModelContext(env.body))
      .map((env) => env.body);
  }
}

// Singleton store
export const agentHistoryStore = new AgentHistoryStore();

// Compatibility: export getDeploymentsByAgent for API/health tests
export const getDeploymentsByAgent = (agentId: string, limit = 20) => agentHistoryStore.getDeployments(limit, agentId);
