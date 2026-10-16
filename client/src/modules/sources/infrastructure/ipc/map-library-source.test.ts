import { describe, expect, it } from 'vitest';
import type { LibrarySource as CoreLibrarySource } from '@midoteca/core';
import {
  mapCoreSource,
  mapCoreStatus,
} from '@/modules/sources/infrastructure/ipc/map-library-source';

function coreSource(overrides: Partial<CoreLibrarySource> = {}): CoreLibrarySource {
  return {
    id: 'src-1',
    rootPath: '/Volumes/HD/Series',
    displayName: null,
    volumeId: null,
    status: 'active',
    lastScanAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('mapCoreStatus', () => {
  it('translates every kernel status to the frontend vocabulary', () => {
    expect(mapCoreStatus('active')).toBe('connected');
    expect(mapCoreStatus('offline')).toBe('disconnected');
    expect(mapCoreStatus('scanning')).toBe('checking');
    expect(mapCoreStatus('error')).toBe('unavailable');
  });
});

describe('mapCoreSource', () => {
  it('uses the display name when present', () => {
    const mapped = mapCoreSource(coreSource({ displayName: 'HD Cursos' }), 42);
    expect(mapped).toMatchObject({
      id: 'src-1',
      path: '/Volumes/HD/Series',
      name: 'HD Cursos',
      status: 'connected',
      itemCount: 42,
      lastScannedAt: null,
    });
  });

  it('derives the display name from the path when absent', () => {
    expect(mapCoreSource(coreSource({ rootPath: '/Volumes/HD/Series/' }), 0).name).toBe('Series');
  });

  it('carries the last scan timestamp through', () => {
    const mapped = mapCoreSource(coreSource({ lastScanAt: '2026-02-02T10:00:00.000Z' }), 1);
    expect(mapped.lastScannedAt).toBe('2026-02-02T10:00:00.000Z');
  });
});
