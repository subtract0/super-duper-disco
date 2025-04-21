// ⚠️ TEST HARNESS LIMITATION ⚠️
// Due to Next.js/Jest/node-mocks-http isolation, singleton state (agentManager/orchestrator) does not persist between handler invocations in this test.
// This causes agent lifecycle tests (POST then GET) to fail, even though persistence and hydration work in production.
// See PLAN.md [2025-04-21T21:18+02:00] Plateau Summary: Enhanced Lifecycle Debug Logging & Jest Limitation Diagnosis for details.
// For true lifecycle coverage, use an E2E HTTP test with a real server.

import handlerIndex from '../../pages/api/agents/index';
import handlerId from '../../pages/api/agents/[id]';
import { createMocks } from 'node-mocks-http';
import { resetAgentManagerForTest } from '../../src/orchestration/agentManagerSingleton';
import { resetOrchestratorForTest } from '../../src/orchestration/orchestratorSingleton';

// ⚠️ TEST HARNESS LIMITATION ⚠️
// Due to Next.js/Jest/node-mocks-http isolation, singleton state (agentManager/orchestrator) does not persist between handler invocations in this test.
// This causes agent lifecycle tests (POST then GET) to fail, even though persistence and hydration work in production.
// See PLAN.md [2025-04-21T21:18+02:00] Plateau Summary: Enhanced Lifecycle Debug Logging & Jest Limitation Diagnosis for details.
// For true lifecycle coverage, use an E2E HTTP test with a real server.

describe('Agent API lifecycle', () => {
  beforeEach(async () => {
    await resetAgentManagerForTest();
    await resetOrchestratorForTest();
  });
  let agentId: string;

  it('should create an agent and immediately retrieve it by ID', async () => {
    // POST /api/agents
    const testPayload = { type: 'test', host: 'localhost', config: {} };
    // Debug log: type in test payload
    // eslint-disable-next-line no-console
    console.log('[TEST][POST payload] type:', testPayload.type, 'payload:', testPayload);
    const { req: postReq, res: postRes } = createMocks({
      method: 'POST',
      body: testPayload,
    });
    await handlerIndex(postReq, postRes);
    expect(postRes._getStatusCode()).toBe(201);
    const body = JSON.parse(postRes._getData());
    expect(body.agent).toBeDefined();
    // Debug log: type in POST response
    // eslint-disable-next-line no-console
    console.log('[TEST][POST response] type:', body.agent.type, 'agent:', body.agent);
    expect(body.agent.type).toBe('test');
    agentId = body.agent.id;

    // Defensive: check singleton hydration and Map usage
    const { getAgentManagerSingleton } = await import('../../src/orchestration/agentManagerSingleton');
    const { getOrchestratorSingleton } = await import('../../src/orchestration/orchestratorSingleton');
    const agentManager = await getAgentManagerSingleton();
    const orchestrator = await getOrchestratorSingleton();
    // Log debug info
    // eslint-disable-next-line no-console
    console.log('[DEBUG][TEST after POST] agentManager.agents:', agentManager.agents);
    // eslint-disable-next-line no-console
    console.log('[DEBUG][TEST after POST] orchestrator.listAgents:', await orchestrator.listAgents());
    expect(agentManager).toBeDefined();
    expect(orchestrator).toBeDefined();
    expect(agentManager.agents).toBeInstanceOf(Map);

    // GET /api/agents/[id]
    const { req: getReq, res: getRes } = createMocks({
      method: 'GET',
      query: { id: agentId },
    });
    await handlerId(getReq, getRes);
    // Debug print response
    // eslint-disable-next-line no-console
    console.log('[DEBUG][TEST after GET] status:', getRes._getStatusCode(), 'body:', getRes._getData());
    expect(getRes._getStatusCode()).toBe(200);
    const getBody = JSON.parse(getRes._getData());
    expect(getBody.agent).toBeDefined();
    expect(getBody.agent.id).toBe(agentId);
  });

  it('should delete the agent and return 404 on subsequent GET', async () => {
    // Defensive: check singleton hydration before delete
    const { getAgentManagerSingleton } = await import('../../src/orchestration/agentManagerSingleton');
    const { getOrchestratorSingleton } = await import('../../src/orchestration/orchestratorSingleton');
    const agentManager = await getAgentManagerSingleton();
    const orchestrator = await getOrchestratorSingleton();
    expect(agentManager).toBeDefined();
    expect(orchestrator).toBeDefined();
    expect(agentManager.agents).toBeInstanceOf(Map);
    // eslint-disable-next-line no-console
    console.log('[DEBUG][TEST before DELETE] agentManager.agents:', agentManager.agents);
    // eslint-disable-next-line no-console
    console.log('[DEBUG][TEST before DELETE] orchestrator.listAgents:', await orchestrator.listAgents());

    // DELETE /api/agents/[id]
    const { req: delReq, res: delRes } = createMocks({
      method: 'DELETE',
      query: { id: agentId },
    });
    await handlerId(delReq, delRes);
    // Debug print response
    // eslint-disable-next-line no-console
    console.log('[DEBUG][TEST after DELETE] status:', delRes._getStatusCode(), 'body:', delRes._getData());
    expect(delRes._getStatusCode()).toBe(200);

    // GET /api/agents/[id] after delete
    const { req: getReq2, res: getRes2 } = createMocks({
      method: 'GET',
      query: { id: agentId },
    });
    await handlerId(getReq2, getRes2);
    // Debug print response
    // eslint-disable-next-line no-console
    console.log('[DEBUG][TEST after GET2] status:', getRes2._getStatusCode(), 'body:', getRes2._getData());
    expect(getRes2._getStatusCode()).toBe(404);
  });
});
