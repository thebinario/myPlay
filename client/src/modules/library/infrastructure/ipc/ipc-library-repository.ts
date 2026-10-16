import type { CourseTree, MediaFile } from '@midoteca/core';
import type { MidotecaBridge } from '@/core/contracts/desktop-bridge';
import type { ContentType, LibraryItem, SearchFilter, SearchResult } from '@/core/domain/library';
import type { LibraryRepository } from '@/core/ports/libraryRepository';
import { mapCourseTree, mapDocumentSummary } from '@/modules/library/infrastructure/ipc/map-catalog';

/**
 * Real `LibraryRepository`, catalog-only.
 *
 * The port is synchronous (`useSyncExternalStore` reads `getItems()` during
 * render) while the kernel is async, so the catalog is kept in an in-memory
 * snapshot hydrated from `catalog.listCourses` / `catalog.getCourseTree` /
 * `catalog.listDocuments` and invalidated by core events. Everything else the
 * aggregated contract requires (playback, reading, pages, search, maintenance)
 * is **delegated** to an injected repository (the in-memory mock for now), so
 * the player, PDF reader and search keep working while only the catalog turns
 * real. See `docs/REFACTORING_ROADMAP.md` (P3/P9).
 */
export class IpcLibraryRepository implements LibraryRepository {
  private items: LibraryItem[] = [];
  private readonly listeners = new Set<() => void>();
  private refreshing: Promise<void> | null = null;
  private detachEvents: (() => void) | null = null;

  constructor(
    private readonly bridge: MidotecaBridge,
    private readonly delegate: LibraryRepository,
  ) {}

  /** Loads the initial catalog snapshot and starts listening to kernel events. */
  hydrate(): void {
    if (!this.detachEvents) {
      this.detachEvents = this.bridge.onEvent((event) => {
        if (/^(course|media|index|source):/.test(event.name)) void this.refresh();
      });
    }
    void this.refresh();
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }

  private async refresh(): Promise<void> {
    if (this.refreshing) return this.refreshing;
    this.refreshing = (async () => {
      const sources = await this.bridge.invoke('sources.list');
      const sourceRootById = new Map(sources.map((source) => [source.id, source.rootPath]));

      const mediaById = new Map<string, MediaFile>();
      for (const source of sources) {
        const files = await this.bridge.invoke('media.listBySource', { sourceId: source.id });
        for (const file of files) mediaById.set(file.id, file);
      }

      const coursePage = await this.bridge.invoke('catalog.listCourses', {});
      const trees = await Promise.all(
        coursePage.items.map((course) =>
          this.bridge
            .invoke('catalog.getCourseTree', { courseId: course.id })
            .catch(() => null)
            .then((tree): CourseTree | null => tree),
        ),
      );
      const documentPage = await this.bridge.invoke('catalog.listDocuments', {});

      this.items = [
        ...trees
          .filter((tree): tree is CourseTree => tree !== null)
          .map((tree) => mapCourseTree(tree, mediaById, sourceRootById)),
        ...documentPage.items.map((document) =>
          mapDocumentSummary(document, mediaById, sourceRootById),
        ),
      ];
      this.emit();
    })();

    try {
      await this.refreshing;
    } finally {
      this.refreshing = null;
    }
  }

  // ─── Catálogo (real, kernel) ───────────────────────────────────────────────

  getItems(type: ContentType = 'all'): LibraryItem[] {
    if (type === 'all') return this.items;
    return this.items.filter((item) => item.type === type);
  }

  getItemById(id: string): LibraryItem | undefined {
    return this.items.find((item) => item.id === id);
  }

  getCourseById(id: string) {
    const item = this.items.find((entry) => entry.id === id && entry.type === 'course');
    return item?.type === 'course' ? item : undefined;
  }

  getDocumentById(id: string) {
    const item = this.items.find((entry) => entry.id === id && entry.type === 'document');
    return item?.type === 'document' ? item : undefined;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Stops listening to kernel events (teardown/tests). */
  dispose(): void {
    this.detachEvents?.();
    this.detachEvents = null;
  }

  // ─── Delegados (playback, leitura, PDF, busca, manutenção) ─────────────────

  saveCourse(course: Parameters<LibraryRepository['saveCourse']>[0]) {
    return this.delegate.saveCourse(course);
  }

  toggleLessonCompletion(courseId: string, lessonId: string) {
    return this.delegate.toggleLessonCompletion(courseId, lessonId);
  }

  savePlaybackPosition(courseId: string, lessonId: string, positionSeconds: number): void {
    this.delegate.savePlaybackPosition(courseId, lessonId, positionSeconds);
  }

  getPlaybackPosition(courseId: string, lessonId: string): number {
    return this.delegate.getPlaybackPosition(courseId, lessonId);
  }

  saveSubtitlePreference(courseId: string, lessonId: string, subtitleId: string | null): void {
    this.delegate.saveSubtitlePreference(courseId, lessonId, subtitleId);
  }

  getSubtitlePreference(courseId: string, lessonId: string): string | null {
    return this.delegate.getSubtitlePreference(courseId, lessonId);
  }

  addCustomSubtitle(
    courseId: string,
    lessonId: string,
    subtitle: Parameters<LibraryRepository['addCustomSubtitle']>[2],
  ): void {
    this.delegate.addCustomSubtitle(courseId, lessonId, subtitle);
  }

  getDocumentReadingState(documentId: string) {
    return this.delegate.getDocumentReadingState(documentId);
  }

  saveDocumentReadingState(
    documentId: string,
    state: Parameters<LibraryRepository['saveDocumentReadingState']>[1],
  ): void {
    this.delegate.saveDocumentReadingState(documentId, state);
  }

  setDocumentUnavailable(documentId: string, unavailable: boolean): void {
    this.delegate.setDocumentUnavailable(documentId, unavailable);
  }

  fetchPageRange(documentId: string, startPage: number, endPage: number) {
    return this.delegate.fetchPageRange(documentId, startPage, endPage);
  }

  resetAll(): void {
    this.delegate.resetAll();
  }

  search(query: string, filter: SearchFilter): SearchResult[] {
    return this.delegate.search(query, filter);
  }
}
