// NOTE: Due to Next.js/Jest/node-mocks-http isolation, singleton state (agentManager/orchestrator) does not persist between handler invocations in this test.
// For true lifecycle coverage, use an E2E HTTP test with a real server.
import handlerIndex from '../../pages/api/agents/index';
import handlerId from '../../pages/api/agents/[id]';
import { createMocks } from 'node-mocks-http';
import { resetAgentManagerForTest } from '../../src/orchestration/agentManagerSingleton';
import { resetOrchestratorForTest } from '../../src/orchestration/orchestratorSingleton';

describe('Agent API lifecycle', () => {
  beforeEach(() => {
    resetAgentManagerForTest();
    resetOrchestratorForTest();
  });
  let agentId: string;

  it('should create an agent and immediately retrieve it by ID', async () => {
    // POST /api/agents
    const { req: postReq, res: postRes } = createMocks({
      method: 'POST',
      body: { type: 'test', host: 'localhost', config: {} },
    });
    await handlerIndex(postReq, postRes);
    expect(postRes._getStatusCode()).toBe(201);
    const body = JSON.parse(postRes._getData());
    expect(body.agent).toBeDefined();
    agentId = body.agent.id;

    // GET /api/agents/[id]
    const { req: getReq, res: getRes } = createMocks({
      method: 'GET',
      query: { id: agentId },
    });
    await handlerId(getReq, getRes);
    expect(getRes._getStatusCode()).toBe(200);
    const getBody = JSON.parse(getRes._getData());
    expect(getBody.agent).toBeDefined();
    expect(getBody.agent.id).toBe(agentId);
  });

  it('should delete the agent and return 404 on subsequent GET', async () => {
    // DELETE /api/agents/[id]
    const { req: delReq, res: delRes } = createMocks({
      method: 'DELETE',
      query: { id: agentId },
    });
    await handlerId(delReq, delRes);
    expect(delRes._getStatusCode()).toBe(200);

    // GET /api/agents/[id] after delete
    const { req: getReq2, res: getRes2 } = createMocks({
      method: 'GET',
      query: { id: agentId },
    });
    await handlerId(getReq2, getRes2);
    expect(getRes2._getStatusCode()).toBe(404);
  });
});
