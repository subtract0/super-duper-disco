// E2E test for agent lifecycle using supertest and Next.js dev server
// This test requires the Next.js dev server to be running on http://localhost:3000
// To run: start the dev server (`npm run dev`) in another terminal, then run this test

import request from 'supertest';

describe('Agent API E2E lifecycle', () => {
  const api = request('http://localhost:3000');
  let agentId: string;

  it('should create an agent and immediately retrieve it by ID', async () => {
    const createRes = await api
      .post('/api/agents')
      .send({ type: 'test-type', host: 'localhost', config: {} })
      .expect(201);
    expect(createRes.body.agent).toBeDefined();
    agentId = createRes.body.agent.id;

    // GET by ID
    const getRes = await api
      .get(`/api/agents/${agentId}`)
      .expect(200);
    expect(getRes.body.agent).toBeDefined();
    expect(getRes.body.agent.id).toBe(agentId);
  });

  it('should delete the agent and return 404 on subsequent GET', async () => {
    await api
      .delete(`/api/agents/${agentId}`)
      .expect(200);
    await api
      .get(`/api/agents/${agentId}`)
      .expect(404);
  });
});
