/**
 * MIDOTECA — Fase 1: fonte única de verdade do catálogo.
 * Ciclo TDD: Red → Green → Refactor
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MockLibraryService, MOCK_COURSES, mockLibraryService } from '@/modules/library/infrastructure/mock-library-repository';
import type { Course, Document } from '@/core/domain/library';

const coursesOf = (svc: MockLibraryService): Course[] => svc.getItems('course') as Course[];
const docsOf = (svc: MockLibraryService): Document[] => svc.getItems('document') as Document[];

describe('MockLibraryService — contrato do repositório (fonte única)', () => {
  let service: MockLibraryService;

  beforeEach(() => {
    service = new MockLibraryService();
  });

  it('notifica assinantes ao alternar conclusão de aula e recalcula progresso', () => {
    const listener = vi.fn();
    const unsubscribe = service.subscribe(listener);
    const course = coursesOf(service).find((c) => c.progress < 100)!;
    const lesson = course.modules.flatMap((m) => m.lessons).find((l) => !l.completed)!;

    const updated = service.toggleLessonCompletion(course.id, lesson.id);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(
      updated?.modules.flatMap((m) => m.lessons).find((l) => l.id === lesson.id)?.completed,
    ).toBe(true);
    expect(service.getCourseById(course.id)?.progress).toBe(updated?.progress);
    unsubscribe();
  });

  it('não notifica depois de cancelar a assinatura', () => {
    const listener = vi.fn();
    const unsubscribe = service.subscribe(listener);
    unsubscribe();
    const course = coursesOf(service)[0];
    service.toggleLessonCompletion(course.id, course.modules[0].lessons[0].id);
    expect(listener).not.toHaveBeenCalled();
  });

  it('mantém referência estável do catálogo entre leituras sem mudanças', () => {
    expect(service.getItems()).toBe(service.getItems());
  });

  it('troca a referência do catálogo após uma mutação', () => {
    const before = service.getItems();
    const course = coursesOf(service)[0];
    service.toggleLessonCompletion(course.id, course.modules[0].lessons[0].id);
    expect(service.getItems()).not.toBe(before);
  });

  it('não muta o objeto de curso anterior ao salvar (imutabilidade)', () => {
    const course = service.getCourseById(coursesOf(service)[0].id)!;
    const snapshot = JSON.stringify(course);
    service.toggleLessonCompletion(course.id, course.modules[0].lessons[0].id);
    expect(JSON.stringify(course)).toBe(snapshot);
  });

  it('resetAll restaura o catálogo e limpa posições de reprodução', () => {
    const originalProgress = MOCK_COURSES[0].progress;
    const course = coursesOf(service)[0];
    const lesson = course.modules[0].lessons[0];
    const originalPosition = lesson.lastPlaybackPosition ?? 0;
    service.savePlaybackPosition(course.id, lesson.id, 123);
    service.toggleLessonCompletion(course.id, lesson.id);

    service.resetAll();

    expect(service.getPlaybackPosition(course.id, lesson.id)).toBe(originalPosition);
    expect(service.getCourseById(course.id)?.progress).toBe(originalProgress);
  });
});

describe('mockLibraryService (singleton) — estado de reprodução não re-renderiza catálogo', () => {
  afterEach(() => mockLibraryService.resetAll());

  it('salvar posição de reprodução não dispara assinantes do catálogo', () => {
    const listener = vi.fn();
    const unsubscribe = mockLibraryService.subscribe(listener);
    mockLibraryService.savePlaybackPosition('course-1', 'les-1-1', 42);
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('salvar estado de leitura só dispara quando a página muda', () => {
    const listener = vi.fn();
    const unsubscribe = mockLibraryService.subscribe(listener);
    const doc = docsOf(mockLibraryService)[0];

    mockLibraryService.saveDocumentReadingState(doc.id, {
      currentPage: 5,
      relativeScrollPosition: 0.2,
      zoom: 1,
      colorMode: 'dark',
    });
    expect(listener).toHaveBeenCalledTimes(1);

    // Rolagem/zoom na mesma página não re-renderiza a Home
    mockLibraryService.saveDocumentReadingState(doc.id, {
      currentPage: 5,
      relativeScrollPosition: 0.9,
      zoom: 1.5,
      colorMode: 'dark',
    });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
