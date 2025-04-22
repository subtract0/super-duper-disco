import { buildModelContext, updateModelContext, validateModelContext, ModelContextObject } from '../../src/protocols/modelContextAdapter';

describe('Model Context Protocol Adapter', () => {
  it('should build a valid model context object', () => {
    const ctx = buildModelContext({
      id: 'ctx1',
      type: 'test-type',
      version: '1',
      value: { foo: 'bar' },
      provenance: 'unit-test',
      access: ['agentA'],
    });
    expect(ctx.id).toBe('ctx1');
    expect(ctx.type).toBe('test');
    expect(ctx.version).toBe('1');
    expect(ctx.value).toEqual({ foo: 'bar' });
    expect(ctx.provenance).toBe('unit-test');
    expect(ctx.access).toEqual(['agentA']);
    expect(typeof ctx.createdAt).toBe('number');
    expect(typeof ctx.updatedAt).toBe('number');
  });

  it('should update a model context object', () => {
    const ctx = buildModelContext({
      id: 'ctx2',
      type: 'test-type',
      version: '1',
      value: { foo: 'bar' },
    });
    const updated = updateModelContext(ctx, { foo: 'baz' });
    expect(updated.value).toEqual({ foo: 'baz' });
    expect(updated.version).toBe('2');
    expect(updated.updatedAt).toBeGreaterThanOrEqual(ctx.updatedAt);
  });

  it('should validate a correct model context object', () => {
    const ctx = buildModelContext({
      id: 'ctx3',
      type: 'test-type',
      version: '1',
      value: {},
    });
    expect(validateModelContext(ctx)).toBe(true);
  });

  it('should invalidate an incorrect model context object', () => {
    expect(validateModelContext({})).toBe(false);
    expect(validateModelContext({ id: 'x', type: 'y' })).toBe(false);
  });
});
