import { buildModelContext, updateModelContext, validateModelContext, ModelContextObject } from './modelContextAdapter';

describe('Model Context Protocol Compliance', () => {
  it('should build a valid ModelContextObject', () => {
    const ctx = buildModelContext({
      id: 'ctx-1',
      type: 'memory',
      version: '1',
      value: { foo: 'bar' },
      provenance: 'test',
      access: ['agentA'],
    });
    expect(ctx.id).toBe('ctx-1');
    expect(ctx.type).toBe('memory');
    expect(ctx.version).toBe('1');
    expect(ctx.value).toEqual({ foo: 'bar' });
    expect(ctx.provenance).toBe('test');
    expect(ctx.access).toEqual(['agentA']);
    expect(typeof ctx.createdAt).toBe('number');
    expect(typeof ctx.updatedAt).toBe('number');
  });

  it('should update ModelContextObject and increment version', () => {
    const ctx = buildModelContext({
      id: 'ctx-2',
      type: 'memory',
      version: '1',
      value: { foo: 'bar' },
    });
    const updated = updateModelContext(ctx, { foo: 'baz' });
    expect(updated.value).toEqual({ foo: 'baz' });
    expect(updated.version).toBe('2');
    expect(updated.updatedAt).toBeGreaterThanOrEqual(ctx.updatedAt);
  });

  it('should validate a correct ModelContextObject', () => {
    const ctx = buildModelContext({
      id: 'ctx-3',
      type: 'memory',
      version: '1',
      value: {},
    });
    expect(validateModelContext(ctx)).toBe(true);
  });

  it('should reject invalid ModelContextObject', () => {
    expect(validateModelContext({})).toBe(false);
    expect(validateModelContext({ id: 1, type: 2, version: 3 })).toBe(false);
  });
});
