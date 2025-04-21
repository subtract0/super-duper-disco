import { AgentOrchestrator } from './agentOrchestrator';
import { getAgentManagerSingleton } from './agentManagerSingleton';

// Persist orchestrator as a global in test mode to avoid Jest/Next.js module isolation
const globalKey = '__CASCADE_ORCHESTRATOR__';

let orchestratorPromise: Promise<AgentOrchestrator> | null = null;

export async function getOrchestratorSingleton(): Promise<AgentOrchestrator> {
  if (!orchestratorPromise) {
    const agentManager = await getAgentManagerSingleton();
    orchestratorPromise = Promise.resolve(new AgentOrchestrator(agentManager));
  }
  return orchestratorPromise;
}

// For legacy sync consumers (should be refactored to async)
export let orchestrator: AgentOrchestrator;
getOrchestratorSingleton().then(o => { orchestrator = o; });

// Helper for tests to reset singleton
export function resetOrchestratorForTest() {
  (globalThis as any)[globalKey] = new AgentOrchestrator(agentManager);
}
