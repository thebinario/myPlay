/**
 * MIDOTECA — Fase 4: persistência real via porta de storage (Ports & Adapters).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { MockLibraryService } from '../services/mockData';
import {
  createInMemoryLibraryStorage,
  localStorageLibraryStorage,
  STORAGE_VERSION,
} from '../services/libraryStorage';

describe('libraryStorage — adapters', () => {
  it('adapter em memória faz round-trip e clear', () => {
    const storage = createInMemoryLibraryStorage();
    expect(storage.load()).toBeNull();

    storage.save({
      version: STORAGE_VERSION,
      items: [],
      playbackPositions: [['c:l', 42]],
      subtitlePreferences: [['c:l', 'sub-en']],
      readingStates: [],
    });

    expect(storage.load()?.playbackPositions).toEqual([['c:l', 42]]);
    storage.clear();
    expect(storage.load()).toBeNull();
  });

  it('adapter localStorage faz round-trip em jsdom', () => {
    localStorageLibraryStorage.clear();
    expect(localStorageLibraryStorage.load()).toBeNull();

    localStorageLibraryStorage.save({
      version: STORAGE_VERSION,
      items: [],
      playbackPositions: [['c:l', 10]],
      subtitlePreferences: [],
      readingStates: [],
    });

    expect(localStorageLibraryStorage.load()?.playbackPositions).toEqual([['c:l', 10]]);
    localStorageLibraryStorage.clear();
  });

  it('ignora dados de versão incompatível', () => {
    localStorageLibraryStorage.clear();
    localStorage.setItem('midoteca:library:v1', JSON.stringify({ version: 999, items: [] }));
    expect(localStorageLibraryStorage.load()).toBeNull();
    localStorageLibraryStorage.clear();
  });
});

describe('MockLibraryService com storage', () => {
  let storage: ReturnType<typeof createInMemoryLibraryStorage>;

  beforeEach(() => {
    storage = createInMemoryLibraryStorage();
  });

  it('persiste e reidrata a posição de reprodução', () => {
    const service = new MockLibraryService(storage);
    service.savePlaybackPosition('course-1', 'les-1-1', 321);

    const rehydrated = new MockLibraryService(storage);
    expect(rehydrated.getPlaybackPosition('course-1', 'les-1-1')).toBe(321);
  });

  it('persiste e reidrata o estado de leitura do PDF', () => {
    const service = new MockLibraryService(storage);
    const docId = service.getItems('document')[0].id;
    service.saveDocumentReadingState(docId, {
      currentPage: 12,
      relativeScrollPosition: 0.4,
      zoom: 1.25,
      colorMode: 'original',
    });

    const rehydrated = new MockLibraryService(storage);
    expect(rehydrated.getDocumentReadingState(docId)).toMatchObject({
      currentPage: 12,
      zoom: 1.25,
      colorMode: 'original',
    });
  });

  it('persiste e reidrata edições do catálogo', () => {
    const service = new MockLibraryService(storage);
    const course = service.getCourseById(service.getItems('course')[0].id)!;
    service.saveCourse({ ...course, title: 'Curso Persistido' });

    const rehydrated = new MockLibraryService(storage);
    expect(rehydrated.getCourseById(course.id)?.title).toBe('Curso Persistido');
  });

  it('resetAll reverte o catálogo persistido', () => {
    const service = new MockLibraryService(storage);
    const course = service.getCourseById(service.getItems('course')[0].id)!;
    const originalTitle = course.title;
    service.saveCourse({ ...course, title: 'Curso Persistido' });
    service.resetAll();

    const rehydrated = new MockLibraryService(storage);
    expect(rehydrated.getCourseById(course.id)?.title).toBe(originalTitle);
  });
});
