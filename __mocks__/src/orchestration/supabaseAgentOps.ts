// __mocks__/src/orchestration/supabaseAgentOps.ts
// Jest mock for supabaseAgentOps (prevents real network calls in tests)

module.exports = {
  logAgentHealthToSupabase: jest.fn().mockResolvedValue(undefined),
  fetchAgentLogsFromSupabase: jest.fn().mockResolvedValue([]),
};
