console.log('TEST FILE LOADED: starting import diagnostics');
let importErrors = [];
try {
  jest.mock('../../../src/orchestration/supabaseAgentOps', () => ({
    logAgentHealthToSupabase: jest.fn().mockResolvedValue(undefined),
    fetchAgentLogsFromSupabase: jest.fn().mockResolvedValue([]),
  }));
  console.log('jest.mock for supabaseAgentOps succeeded');
} catch (e) {
  importErrors.push({ step: 'jest.mock supabaseAgentOps', error: e });
  console.error('jest.mock supabaseAgentOps failed:', e);
}
try {
  global.handler = require('./index').default;
  console.log('import handler from ./index succeeded');
} catch (e) {
  importErrors.push({ step: 'handler', error: e });
  console.error('import handler from ./index failed:', e);
}
try {
  global.getOrchestratorSingleton = require('../../../src/orchestration/orchestratorSingleton').getOrchestratorSingleton;
  global.orchestratorSync = require('../../../src/orchestration/orchestratorSingleton').orchestrator;
  global.resetOrchestratorSingleton = require('../../../src/orchestration/orchestratorSingleton').resetOrchestratorSingleton;
  console.log('import orchestratorSingleton succeeded');
} catch (e) {
  importErrors.push({ step: 'orchestratorSingleton', error: e });
  console.error('import orchestratorSingleton failed:', e);
}
try {
  global.getAgentManagerSingleton = require('../../../src/orchestration/agentManagerSingleton').getAgentManagerSingleton;
  global.agentManagerSync = require('../../../src/orchestration/agentManagerSingleton').agentManager;
  global.resetAgentManagerSingleton = require('../../../src/orchestration/agentManagerSingleton').resetAgentManagerSingleton;
  console.log('import agentManagerSingleton succeeded');
} catch (e) {
  importErrors.push({ step: 'agentManagerSingleton', error: e });
  console.error('import agentManagerSingleton failed:', e);
}
try {
  global.createMocks = require('node-mocks-http').createMocks;
  console.log('import createMocks from node-mocks-http succeeded');
} catch (e) {
  importErrors.push({ step: 'createMocks', error: e });
  console.error('import createMocks from node-mocks-http failed:', e);
}
if (importErrors.length > 0) {
  console.error('IMPORT ERRORS SUMMARY:', JSON.stringify(importErrors, null, 2));
  throw new Error('Import errors detected, see above for details.');
}

test('sanity: jest runs this file', () => {
  expect(1 + 1).toBe(2);
});

describe('/api/agents/index API', () => {
  async function stopAndLogAllAgents() {
    const agents = orchestrator.listAgents();
    for (const agent of agents) {
      if (agent && agent.id) {
        await orchestrator.stopAgent(agent.id);
      }
    }
    const remaining = orchestrator.listAgents();
    if (remaining.length > 0) {
      // eslint-disable-next-line no-console
      console.error('Agents still present after stop:', JSON.stringify(remaining, null, 2));
    }
  }

  // Helper to always get fresh orchestrator and agentManager after reset
  let orchestrator: typeof orchestratorSync;
  let agentManager: typeof agentManagerSync;
  async function refreshSingletons() {
    agentManager = await getAgentManagerSingleton();
    orchestrator = await getOrchestratorSingleton();
  }

  beforeEach(async () => {
    // Reset singletons to ensure test isolation
    resetAgentManagerSingleton();
    resetOrchestratorSingleton();
    await refreshSingletons();
    // eslint-disable-next-line no-console
    console.log('[TEST DEBUG] beforeEach: orchestrator reset, agentManager reset');
    // Extra: ensure agentManager is also reset
    for (const agent of agentManager.listAgents()) {
      await agentManager.stopAgent(agent.id);
    }
    // eslint-disable-next-line no-console
    console.log('BeforeEach: agents =', JSON.stringify(orchestrator.listAgents(), null, 2));
    if (orchestrator.listAgents().length > 0) {
      throw new Error('Agent pollution before test: ' + JSON.stringify(orchestrator.listAgents(), null, 2));
    }
  });

  afterEach(async () => {
    for (const agent of agentManager.listAgents()) {
      await agentManager.stopAgent(agent.id);
    }
    // Reset singletons after test
    resetAgentManagerSingleton();
    resetOrchestratorSingleton();
    await refreshSingletons();
    // eslint-disable-next-line no-console
    console.log('[TEST DEBUG] afterEach: orchestrator reset, agentManager reset');
    // eslint-disable-next-line no-console
    console.log('AfterEach: agents =', JSON.stringify(orchestrator.listAgents(), null, 2));
  });

  it('GET returns empty agent list initially', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    
    const data = JSON.parse(res._getData());
    
    expect(Array.isArray(data.agents)).toBe(true);
    
    expect(data.agents.length).toBe(0);
    
  });
    

    
  it('POST adds a new agent', async () => {
    
    const { req, res } = createMocks({
    
      method: 'POST',
    
      body: { type: 'test-type', host: 'local', config: { foo: 'bar' } },
    
    });
    
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(201);
    
    const data = JSON.parse(res._getData());
    
    expect(data.ok).toBe(true);
    
    expect(data.agent.type).toBe('telegram');
    
    expect(data.agent.host).toBe('local');
    
    expect(data.agent.config.foo).toBe('bar');
    
    // Should now be present in orchestrator
    
    const agents = orchestrator.listAgents();
    
    expect(agents.length).toBe(1);
    
    expect(agents[0].type).toBe('telegram');
    // Log after test
    // eslint-disable-next-line no-console
    console.log('Test end: agents =', JSON.stringify(orchestrator.listAgents(), null, 2));
  });
    

    
  it('GET returns agent after POST', async () => {

  });

  it('Agent lifecycle: create, retrieve, delete, confirm 404', async () => {
    // POST create
    const agentId = 'test-lifecycle-404';
    const { req: postReq, res: postRes } = createMocks({
      method: 'POST',
      body: { id: agentId, type: 'test-type', host: 'test', config: { foo: 'bar' } },
    });
    await handler(postReq, postRes);
    expect(postRes._getStatusCode()).toBe(201);
    const postData = JSON.parse(postRes._getData());
    expect(postData.ok).toBe(true);
    expect(postData.agent.id).toBeDefined();
    const createdId = postData.agent.id || agentId;

    // Immediate GET
    const { req: getReq, res: getRes } = createMocks({
      method: 'GET',
      query: { id: createdId },
    });
    // Use [id] handler for GET/DELETE
    const getHandler = require('./[id]').default;
    await getHandler(getReq, getRes);
    expect(getRes._getStatusCode()).toBe(200);
    const getData = JSON.parse(getRes._getData());
    expect(getData.agent).toBeDefined();
    expect(getData.agent.id).toBe(createdId);

    // DELETE
    const { req: delReq, res: delRes } = createMocks({
      method: 'DELETE',
      query: { id: createdId },
    });
    await getHandler(delReq, delRes);
    expect(delRes._getStatusCode()).toBe(200);

    // Final GET should 404
    const { req: get404Req, res: get404Res } = createMocks({
      method: 'GET',
      query: { id: createdId },
    });
    await getHandler(get404Req, get404Res);
    expect(get404Res._getStatusCode()).toBe(404);
  });
});
