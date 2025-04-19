import { buildA2AEnvelope, parseA2AEnvelope, A2AEnvelope } from './a2aAdapter';

describe('A2A Protocol Compliance', () => {
  it('should negotiate protocol version correctly', () => {
    const { negotiateA2AVersion } = require('./a2aAdapter');
    expect(negotiateA2AVersion('1', '2')).toBe('1');
    expect(negotiateA2AVersion('2', '1')).toBe('1');
    expect(negotiateA2AVersion(undefined, '2')).toBe('2');
    expect(negotiateA2AVersion('3', undefined)).toBe('3');
    expect(negotiateA2AVersion(undefined, undefined)).toBe('1');
  });

  it('should default to version 1 if missing', () => {
    const { buildA2AEnvelope, parseA2AEnvelope } = require('./a2aAdapter');
    const envelope = buildA2AEnvelope({ type: 'task', from: 'a', to: 'b', body: {} });
    // Remove version field to simulate legacy envelope
    delete envelope.version;
    const parsed = parseA2AEnvelope(envelope);
    expect(parsed.version).toBe('1');
  });
  it('should build a valid A2A envelope', () => {
    const envelope = buildA2AEnvelope({
      type: 'task',
      from: 'agentA',
      to: 'agentB',
      body: { foo: 'bar' },
      threadId: 'thread-1',
      signature: 'sig',
    });
    expect(envelope.protocol).toBe('A2A');
    expect(typeof envelope.id).toBe('string');
    expect(envelope.type).toBe('task');
    expect(envelope.from).toBe('agentA');
    expect(envelope.to).toBe('agentB');
    expect(envelope.body).toEqual({ foo: 'bar' });
    expect(envelope.threadId).toBe('thread-1');
    expect(envelope.signature).toBe('sig');
    expect(typeof envelope.createdAt).toBe('number');
  });

  it('should parse a valid A2A envelope', () => {
    const envelope = buildA2AEnvelope({
      type: 'status',
      from: 'agentX',
      to: 'agentY',
      body: { status: 'ok' },
    });
    const parsed = parseA2AEnvelope(envelope);
    expect(parsed).toEqual(envelope);
  });

  it('should throw on invalid protocol', () => {
    expect(() => parseA2AEnvelope({ protocol: 'MCP' })).toThrow('Not an A2A message');
  });

  it('should support optional fields', () => {
    const envelope = buildA2AEnvelope({
      type: 'control',
      from: 'a',
      to: 'b',
      body: {},
    });
    expect(envelope.threadId).toBeUndefined();
    expect(envelope.signature).toBeUndefined();
  });
});
