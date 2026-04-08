import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

class MockWorker {
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public postMessage = vi.fn();
}

describe('useAdaptiveStore computeMaps contract', () => {
  const originalWindow = globalThis.window;
  const originalWorker = globalThis.Worker;

  beforeEach(() => {
    vi.resetModules();
    Object.defineProperty(globalThis, 'window', {
      value: {},
      configurable: true
    });
    Object.defineProperty(globalThis, 'Worker', {
      value: MockWorker,
      configurable: true
    });
  });

  afterEach(() => {
    if (originalWindow === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).window;
    } else {
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        configurable: true
      });
    }

    if (originalWorker === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as any).Worker;
    } else {
      Object.defineProperty(globalThis, 'Worker', {
        value: originalWorker,
        configurable: true
      });
    }
  });

  test('uses uniform-time as default binningMode when options are omitted', async () => {
    const workerInstances: MockWorker[] = [];
    class WorkerWithTracking extends MockWorker {
      constructor() {
        super();
        workerInstances.push(this);
      }
    }

    Object.defineProperty(globalThis, 'Worker', {
      value: WorkerWithTracking,
      configurable: true
    });

    const { useAdaptiveStore } = await import('./useAdaptiveStore');

    useAdaptiveStore.getState().computeMaps(Float32Array.from([1, 2, 3]), [0, 10]);

    expect(workerInstances).toHaveLength(1);
    const worker = workerInstances[0];
    expect(worker.postMessage).toHaveBeenCalledTimes(1);
    const firstArg = worker.postMessage.mock.calls[0]?.[0] as { config: { binningMode?: string } };
    expect(firstArg.config.binningMode).toBe('uniform-time');
  });

  test('passes uniform-events binningMode override through worker payload', async () => {
    const workerInstances: MockWorker[] = [];
    class WorkerWithTracking extends MockWorker {
      constructor() {
        super();
        workerInstances.push(this);
      }
    }

    Object.defineProperty(globalThis, 'Worker', {
      value: WorkerWithTracking,
      configurable: true
    });

    const { useAdaptiveStore } = await import('./useAdaptiveStore');

    useAdaptiveStore
      .getState()
      .computeMaps(Float32Array.from([1, 2, 3]), [0, 10], { binningMode: 'uniform-events' });

    expect(workerInstances).toHaveLength(1);
    const worker = workerInstances[0];
    const firstArg = worker.postMessage.mock.calls[0]?.[0] as { config: { binningMode?: string } };
    expect(firstArg.config.binningMode).toBe('uniform-events');
  });
});
