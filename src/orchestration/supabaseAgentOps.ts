import { supabase } from '../../utils/supabaseClient';

export interface AgentHealthLog {
  id: string;
  agent_id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  health: string;
  context?: Record<string, any>;
}

// Log agent health/status update to Supabase
export async function logAgentHealthToSupabase(
  agent_id: string,
  health: string,
  message: string,
  level: 'info' | 'warn' | 'error' = 'info',
  context?: Record<string, any>
): Promise<void> {
  const { error } = await supabase.from('agent_health_logs').insert([
    {
      agent_id,
      timestamp: new Date().toISOString(),
      level,
      message,
      health,
      context: context ? JSON.stringify(context) : null,
    },
  ]);
  if (error) {
    console.error('[supabaseAgentOps] Failed to log agent health:', error);
  }
}

// Fetch recent logs for an agent from Supabase
export async function fetchAgentLogsFromSupabase(
  agent_id: string,
  limit: number = 20
): Promise<AgentHealthLog[]> {
  const { data, error } = await supabase
    .from('agent_health_logs')
    .select('*')
    .eq('agent_id', agent_id)
    .order('timestamp', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[supabaseAgentOps] Failed to fetch logs:', error);
    return [];
  }
  return (Array.isArray(data) ? data.map(log => ({
    id: typeof log.id === 'string' ? log.id : '',
    agent_id: typeof log.agent_id === 'string' ? log.agent_id : '',
    timestamp: typeof log.timestamp === 'string' ? log.timestamp : '',
    level: log.level === 'info' || log.level === 'warn' || log.level === 'error' ? log.level : 'info',
    message: typeof log.message === 'string' ? log.message : '',
    health: typeof log.health === 'string' ? log.health : '',
    context: typeof log.context === 'object' && log.context !== null ? log.context : undefined
  })) : []) as AgentHealthLog[];
}
