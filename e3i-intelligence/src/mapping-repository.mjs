function clone(value) {
  return structuredClone(value);
}

export function mappingStorageKey(tenantId, mappingId) {
  return JSON.stringify([String(tenantId), String(mappingId)]);
}

export function assertMappingRepository(repository) {
  if (!repository || typeof repository !== 'object') {
    throw new TypeError('mapping repository is required');
  }
  for (const method of ['save', 'get', 'list']) {
    if (typeof repository[method] !== 'function') {
      throw new TypeError(`mapping repository must implement ${method}()`);
    }
  }
  return repository;
}

export class InMemoryMappingRepository {
  #items = new Map();

  save(mapping) {
    const key = mappingStorageKey(mapping.tenantId, mapping.mappingId);
    this.#items.set(key, clone(mapping));
    return clone(mapping);
  }

  get(tenantId, mappingId) {
    const item = this.#items.get(mappingStorageKey(tenantId, mappingId));
    return item ? clone(item) : null;
  }

  list(tenantId) {
    return [...this.#items.values()]
      .filter((item) => item.tenantId === tenantId)
      .map(clone);
  }
}
