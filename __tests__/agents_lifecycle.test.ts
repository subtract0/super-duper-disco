const { createMocks } = require('node-mocks-http');
const indexHandler = require('../pages/api/agents/index').default;
const idHandler = require('../pages/api/agents/[id]').default;
const { getOrchestratorSingleton, orchestrator, resetOrchestratorSingleton } = require('../src/orchestration/orchestratorSingleton');
const { getAgentManagerSingleton, resetAgentManagerSingleton } = require('../src/orchestration/agentManagerSingleton');

describe('Agent API Lifecycle', () => {
  beforeEach(async () => {
    resetAgentManagerSingleton();
    resetOrchestratorSingleton();
    const agentManager = await getAgentManagerSingleton();
    await getOrchestratorSingleton();
    // Clear existing agents
    for (const a of await agentManager.listAgents()) {
      await agentManager.stopAgent(a.id);
    }
  });

  afterEach(async () => {
    const agentManager = await getAgentManagerSingleton();
    // Cleanup remaining agents
    for (const a of await agentManager.listAgents()) {
      await agentManager.stopAgent(a.id);
    }
    resetAgentManagerSingleton();
    resetOrchestratorSingleton();
  });

  test('sanity: jest runs tests', () => {
    expect(1 + 1).toBe(2);
  });

  it('GET /api/agents returns empty list', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await indexHandler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(Array.isArray(data.agents)).toBe(true);
    expect(data.agents.length).toBe(0);
  });

  it('Agent lifecycle: create, retrieve, delete, confirm 404', async () => {
    // POST create
    const postBody = { type: 'test-type', host: 'test', config: { foo: 'bar' } };
    const { req: postReq, res: postRes } = createMocks({ method: 'POST', body: postBody });
    await indexHandler(postReq, postRes);
    expect(postRes._getStatusCode()).toBe(201);
    const postData = JSON.parse(postRes._getData());
    const id = postData.agent.id;
    expect(postData.ok).toBe(true);
    expect(id).toBeDefined();

    // GET by id
    const { req: getReq, res: getRes } = createMocks({ method: 'GET', query: { id } });
    await idHandler(getReq, getRes);
    expect(getRes._getStatusCode()).toBe(200);
    const getData = JSON.parse(getRes._getData());
    expect(getData.agent.id).toBe(id);

    // DELETE
    const { req: delReq, res: delRes } = createMocks({ method: 'DELETE', query: { id } });
    await idHandler(delReq, delRes);
    expect(delRes._getStatusCode()).toBe(200);

    // GET should 404
    const { req: get404Req, res: get404Res } = createMocks({ method: 'GET', query: { id } });
    await idHandler(get404Req, get404Res);
    expect(get404Res._getStatusCode()).toBe(404);
  });
});
