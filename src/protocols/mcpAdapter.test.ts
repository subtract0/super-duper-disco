import { buildMCPEnvelope, parseMCPEnvelope, MCPEnvelope } from './mcpAdapter';

describe('Model Context Protocol (MCP) Envelope Compliance', () => {
  it('should negotiate protocol version correctly', () => {
    const { negotiateMCPVersion } = require('./mcpAdapter');
    expect(negotiateMCPVersion('1', '2')).toBe('1');
    expect(negotiateMCPVersion('2', '1')).toBe('1');
    expect(negotiateMCPVersion(undefined, '2')).toBe('2');
    expect(negotiateMCPVersion('3', undefined)).toBe('3');
    expect(negotiateMCPVersion(undefined, undefined)).toBe('1');
  });

  it('should default to version 1 if missing', () => {
    const { buildMCPEnvelope, parseMCPEnvelope } = require('./mcpAdapter');
    const env = buildMCPEnvelope({ type: 'fetch', from: 'a', to: 'b', body: {} });
    // Remove version field to simulate legacy envelope
    delete env.version;
    const parsed = parseMCPEnvelope(env);
    expect(parsed!.version).toBe('1');
  });
  it('should build a valid MCP envelope', () => {
    const env = buildMCPEnvelope({
      type: 'fetch',
      from: 'agentA',
      to: 'agentB',
      body: { ctx: 'foo' },
      threadId: 'thread-1',
      version: '1',
      signature: 'sig',
    });
    expect(env.protocol).toBe('MCP');
    expect(typeof env.id).toBe('string');
    expect(env.type).toBe('fetch');
    expect(env.from).toBe('agentA');
    expect(env.to).toBe('agentB');
    expect(env.body).toEqual({ ctx: 'foo' });
    expect(env.threadId).toBe('thread-1');
    expect(env.signature).toBe('sig');
    expect(env.version).toBe('1');
    expect(typeof env.createdAt).toBe('number');
  });

  it('should parse a valid MCP envelope', () => {
    const env = buildMCPEnvelope({
      type: 'update',
      from: 'agentX',
      to: 'agentY',
      body: { data: 42 },
    });
    const parsed = parseMCPEnvelope(env);
    expect(parsed).toEqual(env);
  });

  it('should return null on invalid MCP envelope', () => {
    expect(parseMCPEnvelope({ protocol: 'A2A' })).toBeNull();
    expect(parseMCPEnvelope({})).toBeNull();
    expect(parseMCPEnvelope(null)).toBeNull();
  });

  it('should support optional fields', () => {
    const env = buildMCPEnvelope({
      type: 'broadcast',
      from: 'a',
      to: 'b',
      body: {},
    });
    expect(env.threadId).toBeUndefined();
    expect(env.signature).toBeUndefined();
    expect(env.version).toBe('1');
  });
});
