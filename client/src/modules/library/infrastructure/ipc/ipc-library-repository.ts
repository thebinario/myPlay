import type { MidotecaBridge } from '@/core/contracts/desktop-bridge';
import type { ContentType, LibraryItem, SearchFilter, SearchResult } from '@/core/domain/library';
import type { LibraryRepository } from '@/core/ports/libraryRepository';
import { loadLibraryCatalog } from '@/modules/library/infrastructure/ipc/load-library-catalog';

/** Real SQLite-backed catalog snapshot; remaining repository operations are delegated (P9). */
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
        if (/^(course|media|index|source):/.test(event.name)) this.refreshSafely();
      });
    }
    this.refreshSafely();
  }

  private refreshSafely(): void {
    void this.refresh().catch((error: unknown) => {
      console.error('[library] falha ao sincronizar catálogo com o núcleo', error);
    });
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }

  private async refresh(): Promise<void> {
    if (this.refreshing) return this.refreshing;
    this.refreshing = (async () => {
      this.items = await loadLibraryCatalog(this.bridge);
      this.emit();
    })();

    try {
      await this.refreshing;
    } finally {
      this.refreshing = null;
    }
  }

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

  async saveDocumentPageCount(documentId: string, pageCount: number): Promise<void> {
    await this.bridge.invoke('documents.updatePageCount', { documentId, pageCount });
    this.items = this.items.map((item) =>
      item.type === 'document' && item.id === documentId ? { ...item, totalPages: pageCount } : item,
    );
    this.emit();
  }

  fetchPageRange(documentId: string, startPage: number, endPage: number) {
    // PDFs reais são carregados e paginados pelo PDF.js a partir do fileUrl.
    // O delegate é exclusivamente mock e não conhece IDs do catálogo SQLite.
    void documentId;
    void startPage;
    void endPage;
    return Promise.resolve([]);
  }

  resetAll(): void {
    this.delegate.resetAll();
  }

  search(query: string, filter: SearchFilter): SearchResult[] {
    return this.delegate.search(query, filter);
  }
}
