import handler from './index';
import { createMocks } from 'node-mocks-http';
import { getHosts, saveHosts } from '../../../__mocks__/persistentStore';

describe('/api/hosts API', () => {
  beforeEach(() => {
    saveHosts([]); // Clear hosts before each test
  });

  it('GET returns empty host list initially', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(Array.isArray(data.hosts)).toBe(true);
    expect(data.hosts.length).toBe(0);
  });

  it('POST adds a new host', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { name: 'Remote Host 2' },
    });
    await handler(req, res);
    expect(res._getStatusCode()).toBe(201);
    const data = JSON.parse(res._getData());
    expect(data.ok).toBe(true);
    expect(data.host.name).toBe('Remote Host 2');
    // Should now be present in persistent store
    const hosts = getHosts();
    expect(hosts.length).toBe(1);
    expect(hosts[0].name).toBe('Remote Host 2');
  });
});
