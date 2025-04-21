import { AgentManager } from './agentManager';

// Persist agentManager as a global in test mode to avoid Jest/Next.js module isolation
const globalKey = '__CASCADE_AGENT_MANAGER__';

export async function getAgentManagerSingleton(): Promise<AgentManager> {
  const globalKey = '__CASCADE_AGENT_MANAGER__';
  if (!(globalThis as any)[globalKey]) {
    (globalThis as any)[globalKey] = await AgentManager.hydrateFromPersistent();
  }
  return (globalThis as any)[globalKey];
}

// For legacy sync consumers (should be refactored to async)
export let agentManager: AgentManager;
getAgentManagerSingleton().then(mgr => { agentManager = mgr; });

// Helper for tests to reset singleton
export function resetAgentManagerForTest() {
  (globalThis as any)[globalKey] = new AgentManager();
}
