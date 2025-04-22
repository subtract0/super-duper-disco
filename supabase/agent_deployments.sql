-- SQL schema for required table used in tests and agent-health endpoints
CREATE TABLE IF NOT EXISTS public.agent_deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL,
  status text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  config jsonb,
  logs jsonb,
  last_health_check timestamptz
);

-- Index for fast lookup by agent_id
CREATE INDEX IF NOT EXISTS idx_agent_deployments_agent_id ON public.agent_deployments(agent_id);

-- Protocol extension: add missing fields for orchestration/LLM agent support
ALTER TABLE public.agent_deployments
  ADD COLUMN IF NOT EXISTS deployment_status text,
  ADD COLUMN IF NOT EXISTS deployment_url text,
  ADD COLUMN IF NOT EXISTS last_deployment_error text,
  ADD COLUMN IF NOT EXISTS last_activity timestamptz,
  ADD COLUMN IF NOT EXISTS crash_count integer DEFAULT 0;
