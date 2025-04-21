import { AgentManager } from './agentManager';

// Persist agentManager as a global in test mode to avoid Jest/Next.js module isolation
const globalKey = '__CASCADE_AGENT_MANAGER__';

let singletonId = null;

export async function getAgentManagerSingleton(): Promise<AgentManager> {
  const globalKey = '__CASCADE_AGENT_MANAGER__';
  if (!(globalThis as any)[globalKey]) {
    singletonId = Math.floor(Math.random() * 1e9);
    console.debug(`[AgentManagerSingleton] Creating new singleton instance, id=${singletonId}`);
    (globalThis as any)[globalKey] = await AgentManager.hydrateFromPersistent();
    (globalThis as any)[globalKey].__singletonId = singletonId;
  } else {
    singletonId = (globalThis as any)[globalKey].__singletonId;
    console.debug(`[AgentManagerSingleton] Returning existing singleton instance, id=${singletonId}`);
  }
  return (globalThis as any)[globalKey];
}


// For legacy sync consumers (should be refactored to async)
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
