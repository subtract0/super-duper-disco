/* Public DTOs shared across the orchestration layer */

export interface AgentHealth {
  status: 'running' | 'stopped' | 'crashed';
  lastHeartbeat?: number;
  uptime?: number;
  crashCount?: number;
  uptimePercent?: number;
  mttr?: number;
  downtime?: number;
}

export interface OrchestratorState {
  state: string;
  health: Record<string, AgentHealth>;
  logs: string[];
  messages: any[];
}

export type OrchestratedAgent = {
  id        : string;
  type      : string;
  status    : 'pending' | 'healthy' | 'running' | 'stopped' | 'error';
  host      : string;
  config    : Record<string, unknown>;
};

export type AgentMessage = {
  from      : string;
  to        : string;
  content   : unknown;
  timestamp : number;
};

export type SwarmState = {
  agents    : OrchestratedAgent[];
  messages  : AgentMessage[];
};

export type AgentCapability = string;
