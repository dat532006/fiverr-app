import { describe, expect, it } from 'vitest';
import { createSessionSnapshotStore } from '../../src/infrastructure/session-storage/session-snapshot-store';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

const throwing = () => {
  throw new DOMException('blocked', 'SecurityError');
};

describe('TASK-013 session snapshot store (I/O only)', () => {
  it('reads null when nothing is stored and the raw string when it is', () => {
    const storage = memoryStorage();
    const store = createSessionSnapshotStore(() => storage);
    expect(store.read()).toEqual({ available: true, raw: null });
    expect(store.write('opaque-value')).toBe(true);
    expect(storage.data.get('servio-session')).toBe('opaque-value');
    expect(store.read()).toEqual({ available: true, raw: 'opaque-value' });
  });

  it('removes only its own key', () => {
    const storage = memoryStorage({ other: 'keep', 'servio-session': 'x' });
    createSessionSnapshotStore(() => storage).remove();
    expect([...storage.data.keys()]).toEqual(['other']);
  });

  it('reports unavailable, false and no throw when every access throws', () => {
    const store = createSessionSnapshotStore(() => ({
      getItem: throwing,
      setItem: throwing,
      removeItem: throwing,
    }));
    expect(store.read()).toEqual({ available: false });
    expect(store.write('x')).toBe(false);
    expect(() => store.remove()).not.toThrow();
  });

  it('treats a storage accessor that throws (blocked sessionStorage) as unavailable', () => {
    const store = createSessionSnapshotStore(throwing);
    expect(store.read()).toEqual({ available: false });
    expect(store.write('x')).toBe(false);
    expect(() => store.remove()).not.toThrow();
  });

  it('never parses the value: it is an opaque string to this layer', () => {
    const storage = memoryStorage({ 'servio-session': '{not json' });
    expect(createSessionSnapshotStore(() => storage).read()).toEqual({
      available: true,
      raw: '{not json',
    });
  });
});
