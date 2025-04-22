

// Persist orchestrator as a global in test mode to avoid Jest/Next.js module isolation
const globalKey = '__CASCADE_ORCHESTRATOR__';

let orchestratorPromise = null;

export async function getOrchestratorSingleton() {
  if (!orchestratorPromise) {
    // Dynamically import dependencies to break circular dependency
    const [{ AgentOrchestrator }, { getAgentManagerSingleton }] = await Promise.all([
      import('./agentOrchestrator'),
      import('./agentManagerSingleton')
    ]);
    const agentManager = await getAgentManagerSingleton();
    orchestratorPromise = Promise.resolve(new AgentOrchestrator(agentManager));
  }
  return orchestratorPromise;
}

// For legacy sync consumers (should be refactored to async)
export let orchestrator;
try {
  getOrchestratorSingleton().then(o => { orchestrator = o; });
  console.log('[orchestratorSingleton] getOrchestratorSingleton().then succeeded');
} catch (e) {
  console.error('[orchestratorSingleton] getOrchestratorSingleton().then failed:', e);
}

// Reset the orchestrator singleton for prod/test
export function resetOrchestratorSingleton() {
  delete (globalThis)[globalKey];
  orchestratorPromise = null;
  orchestrator = undefined;
  if (typeof console !== 'undefined') {
    console.debug('[OrchestratorSingleton] Singleton reset');
  }
}
// Helper for tests to reset singleton
export async function resetOrchestratorForTest() {
  resetOrchestratorSingleton();
  const mgr = await (await import('./agentManager')).AgentManager.hydrateFromPersistent();
  (globalThis)[globalKey] = new AgentOrchestrator(mgr);
}
