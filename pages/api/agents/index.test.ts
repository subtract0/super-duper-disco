import handler from './index';
import { createMocks } from 'node-mocks-http';
import { getAgents, saveAgents } from '../../../__mocks__/persistentStore';

describe('/api/agents API', () => {
  beforeEach(() => {
    saveAgents([]); // Clear agents before each test
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
      body: { type: 'telegram', host: 'local', config: { foo: 'bar' } },
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(201);
    const data = JSON.parse(res._getData());
    expect(data.ok).toBe(true);
    expect(data.agent.type).toBe('telegram');
    expect(data.agent.host).toBe('local');
    expect(data.agent.config.foo).toBe('bar');
    // Should now be present in persistent store
    const agents = getAgents();
    expect(agents.length).toBe(1);
    expect(agents[0].type).toBe('telegram');
  });
});
