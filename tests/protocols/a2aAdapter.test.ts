import { buildA2AEnvelope, parseA2AEnvelope, A2AEnvelope } from '../../src/protocols/a2aAdapter';

describe('A2A Protocol Adapter', () => {
  it('should build a valid A2A envelope', () => {
    const envelope = buildA2AEnvelope({
      type: 'test-message',
      from: 'agentA',
      to: 'agentB',
      body: { foo: 'bar' },
      threadId: 'thread-1',
      signature: 'sig',
    });
    expect(envelope.protocol).toBe('A2A');
    expect(envelope.type).toBe('test-message');
    expect(envelope.from).toBe('agentA');
    expect(envelope.to).toBe('agentB');
    expect(envelope.threadId).toBe('thread-1');
    expect(envelope.body).toEqual({ foo: 'bar' });
    expect(envelope.signature).toBe('sig');
    expect(typeof envelope.id).toBe('string');
    expect(typeof envelope.createdAt).toBe('number');
  });

  it('should parse a valid A2A envelope', () => {
    const envelope = buildA2AEnvelope({
      type: 'test',
      from: 'a',
      to: 'b',
      body: 'hi',
    });
    const parsed = parseA2AEnvelope(envelope);
    expect(parsed).toEqual(envelope);
  });

  it('should throw if not an A2A envelope', () => {
    expect(() => parseA2AEnvelope({ foo: 'bar' })).toThrow('Not an A2A message');
  });
});
