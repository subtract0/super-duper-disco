import { supabase } from '../utils/supabaseClient';
import type { AgentInfo } from './agentManager';

const TABLE = 'agents_registry';

export async function saveAgentInfo(agent: AgentInfo): Promise<void> {
  await supabase.from(TABLE).upsert([
    {
      id: agent.id,
      name: agent.name,
      status: agent.status,
      logs: agent.logs,
      type: agent.type,
      config: agent.config,
      lastHeartbeat: agent.lastHeartbeat,
      lastActivity: agent.lastActivity,
      crashCount: agent.crashCount,
      deploymentStatus: agent.deploymentStatus,
      deploymentUrl: agent.deploymentUrl,
      lastDeploymentError: agent.lastDeploymentError,
    },
  ], { onConflict: ['id'] });
}

export async function getAgentInfo(id: string): Promise<AgentInfo | null> {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
  if (error || !data) return null;
  return data as AgentInfo;
}

export async function deleteAgentInfo(id: string): Promise<void> {
  await supabase.from(TABLE).delete().eq('id', id);
}

export async function listAgentInfos(): Promise<AgentInfo[]> {
  const { data } = await supabase.from(TABLE).select('*');
  return data || [];
}
