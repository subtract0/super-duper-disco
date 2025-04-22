import { AgentManager } from './agentManager';

// Persist agentManager as a global in test mode to avoid Jest/Next.js module isolation
const globalKey = '__CASCADE_AGENT_MANAGER__';

let singletonId = null;

export async function getAgentManagerSingleton(): Promise<AgentManager> {
  if (!(globalThis as any)[globalKey]) {
    console.debug(`[AgentManagerSingleton] Creating new singleton instance`);
    (globalThis as any)[globalKey] = await AgentManager.hydrateFromPersistent();
  } else {
    console.debug(`[AgentManagerSingleton] Returning existing singleton instance`);
  }
  return (globalThis as any)[globalKey];
}


// DEPRECATED: For legacy sync consumers only. Use getAgentManagerSingleton() async accessor instead.
export let agentManager: AgentManager;
getAgentManagerSingleton().then(mgr => {
  // Patch prototype if missing (in rare test edge cases)
  if (Object.getPrototypeOf(mgr) !== AgentManager.prototype) {
    Object.setPrototypeOf(mgr, AgentManager.prototype);
  }
  agentManager = mgr;
});

// Reset the agent manager singleton for prod/test
export function resetAgentManagerSingleton() {
  delete (globalThis as any)[globalKey];
  agentManager = undefined as any;
  if (typeof console !== 'undefined') {
    console.debug('[AgentManagerSingleton] Singleton reset');
  }
}
// Helper for tests to reset singleton
export async function resetAgentManagerForTest() {
  resetAgentManagerSingleton();
  (globalThis as any)[globalKey] = await AgentManager.hydrateFromPersistent();
}
