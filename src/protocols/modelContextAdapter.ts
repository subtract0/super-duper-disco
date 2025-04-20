// modelContextAdapter.ts
// Adapter for Model Context Protocol operations (get/set/update context)

export type ModelContextObject = {
  id: string;
  type: string;
  version: string;
  value: any;
  provenance?: string;
  access?: string[];
  createdAt: number;
  updatedAt: number;
};

/**
 * Build a Model Context Protocol-compliant context object
 */
export function buildModelContext({
  id,
  type,
  version,
  value,
  provenance,
  access,
}: {
  id: string;
  type: string;
  version: string;
  value: any;
  provenance?: string;
  access?: string[];
}): ModelContextObject {
  const now = Date.now();
  return {
    id,
    type,
    version,
    value,
    provenance,
    access,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Update a Model Context object (returns new version)
 */
export function updateModelContext(obj: ModelContextObject, newValue: any): ModelContextObject {
  return {
    ...obj,
    value: newValue,
    updatedAt: Date.now(),
    version: (parseInt(obj.version, 10) + 1).toString(),
  };
}

/**
 * Validate a Model Context object
 */
export function validateModelContext(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as { id?: unknown; type?: unknown; version?: unknown };
  return (
    typeof o.id === 'string' &&
    typeof o.type === 'string' &&
    typeof o.version === 'string'
  );
}
