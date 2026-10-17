import type { MidotecaBridge } from '@/core/contracts/desktop-bridge';
import type { Course, Document } from '@/core/domain/library';
import type { ContentType, LibraryItem, SearchFilter, SearchResult } from '@/core/domain/library';
import type { LibraryRepository } from '@/core/ports/libraryRepository';
import { loadLibraryCatalog } from '@/modules/library/infrastructure/ipc/load-library-catalog';

/** Real SQLite-backed catalog snapshot; remaining repository operations are delegated (P9). */
export class IpcLibraryRepository implements LibraryRepository {
  private items: LibraryItem[] = [];
  private readonly listeners = new Set<() => void>();
  private refreshing: Promise<void> | null = null;
  private detachEvents: (() => void) | null = null;
  private readonly readingProgressTimers = new Map<string, ReturnType<typeof setTimeout>>();

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
      this.items.flatMap(getDocumentsFromItem).forEach((document) => {
        if (document.readingState) {
          this.delegate.saveDocumentReadingState(document.id, document.readingState);
        }
      });
      this.items.forEach((item) => {
        if (item.type !== 'course') return;
        item.modules.forEach((module) =>
          module.lessons.forEach((lesson) => {
            if (lesson.lastPlaybackPosition !== undefined) {
              this.delegate.savePlaybackPosition(item.id, lesson.id, lesson.lastPlaybackPosition);
            }
          }),
        );
      });
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

  private replaceCatalogItem(item: LibraryItem): void {
    this.items = this.items.map((current) => (current.id === item.id ? item : current));
  }

  getDocumentById(id: string) {
    return this.items.flatMap(getDocumentsFromItem).find((document) => document.id === id);
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

  async saveCourse(course: Course): Promise<Course> {
    const current = this.getCourseById(course.id);
    const currentLessons = new Map(
      current?.modules.flatMap((module) =>
        module.lessons.map((lesson) => [lesson.id, lesson.title]),
      ) ?? [],
    );
    await this.bridge.invoke('courses.saveOrganization', {
      courseId: course.id,
      ...(current?.title !== course.title ? { courseTitle: course.title } : {}),
      modules: course.modules.map((module) => {
        const currentModule = current?.modules.find((candidate) => candidate.id === module.id);
        return {
          id: module.id,
          ...(currentModule?.title !== module.title ? { title: module.title } : {}),
          lessonIds: module.lessons.map((lesson) => lesson.id),
          lessonTitles: module.lessons
            .filter((lesson) => currentLessons.get(lesson.id) !== lesson.title)
            .map((lesson) => ({ lessonId: lesson.id, title: lesson.title })),
        };
      }),
    });

    const currentDocuments = new Map(
      this.items
        .flatMap((item) =>
          item.type === 'course'
            ? [
                ...(item.documents ?? []),
                ...item.modules.flatMap((module) => module.documents ?? []),
              ]
            : item.type === 'document'
              ? [item]
              : [],
        )
        .map((document) => [document.id, document.title]),
    );
    for (const document of course.documents ?? []) {
      if (currentDocuments.get(document.id) !== document.title) {
        await this.bridge.invoke('documents.rename', {
          documentId: document.id,
          title: document.title,
        });
      }
    }

    await this.refresh();
    const refreshed = this.getCourseById(course.id) ?? course;
    return { ...refreshed, documents: course.documents };
  }

  toggleLessonCompletion(courseId: string, lessonId: string) {
    const course = this.getCourseById(courseId);
    const target = course?.modules
      .flatMap((module) => module.lessons)
      .find((lesson) => lesson.id === lessonId);
    if (!course || !target) return undefined;

    const completed = !target.completed;
    const modules = course.modules.map((module) => ({
      ...module,
      lessons: module.lessons.map((lesson) =>
        lesson.id === lessonId ? { ...lesson, completed } : lesson,
      ),
    }));
    const updated = {
      ...course,
      modules,
    };
    this.replaceCatalogItem(updated);
    this.emit();
    this.persistPlaybackProgress(
      lessonId,
      this.delegate.getPlaybackPosition(courseId, lessonId),
      target.duration,
      completed,
      true,
    );
    return updated;
  }

  savePlaybackPosition(courseId: string, lessonId: string, positionSeconds: number): void {
    this.delegate.savePlaybackPosition(courseId, lessonId, positionSeconds);
    const course = this.getCourseById(courseId);
    const lesson = course?.modules
      .flatMap((module) => module.lessons)
      .find((item) => item.id === lessonId);
    if (lesson) {
      this.persistPlaybackProgress(lessonId, positionSeconds, lesson.duration, lesson.completed);
    }
  }

  private persistPlaybackProgress(
    lessonId: string,
    positionSeconds: number,
    durationSeconds: number,
    completed: boolean,
    refreshAfterSave = false,
  ): void {
    void this.bridge
      .invoke('progress.savePlayback', {
        lessonId,
        positionMs: Math.round(positionSeconds * 1000),
        durationMs: durationSeconds > 0 ? Math.round(durationSeconds * 1000) : null,
        completedAt: completed ? new Date().toISOString() : null,
      })
      .then(() => (refreshAfterSave ? this.refresh() : undefined))
      .catch((error: unknown) => {
        console.error('[library] falha ao salvar progresso da aula', error);
      });
  }

  getPlaybackPosition(courseId: string, lessonId: string): number {
    const lesson = this.getCourseById(courseId)
      ?.modules.flatMap((module) => module.lessons)
      .find((item) => item.id === lessonId);
    return Math.max(
      this.delegate.getPlaybackPosition(courseId, lessonId),
      lesson?.lastPlaybackPosition ?? 0,
    );
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
    const document = this.items
      .flatMap(getDocumentsFromItem)
      .find((item) => item.id === documentId);
    if (document?.readingState) return document.readingState;
    return this.delegate.getDocumentReadingState(documentId);
  }

  saveDocumentReadingState(
    documentId: string,
    state: Parameters<LibraryRepository['saveDocumentReadingState']>[1],
  ): void {
    const previousState = this.getDocumentReadingState(documentId);
    this.delegate.saveDocumentReadingState(documentId, state);
    this.items = this.items.map((item) =>
      updateDocumentInItem(item, documentId, (document) => ({
        ...document,
        lastReadPage: state.currentPage,
        isRead: !!state.completedAt,
        readingState: { ...state },
      })),
    );
    this.emit();
    const completionChanged = previousState?.completedAt !== state.completedAt;
    const save = () => {
      this.readingProgressTimers.delete(documentId);
      void this.bridge
        .invoke('progress.saveReading', {
          documentId,
          page: state.currentPage,
          scrollRatio: state.relativeScrollPosition,
          zoom: state.zoom,
          theme: state.colorMode,
          completedAt: state.completedAt ?? null,
        })
        .then(() => (completionChanged ? this.refresh() : undefined))
        .catch((error: unknown) => {
          console.error('[library] falha ao salvar progresso do PDF', error);
        });
    };
    const pendingSave = this.readingProgressTimers.get(documentId);
    if (pendingSave) clearTimeout(pendingSave);
    if (completionChanged) {
      save();
      return;
    }
    this.readingProgressTimers.set(documentId, setTimeout(save, 250));
  }

  setDocumentUnavailable(documentId: string, unavailable: boolean): void {
    this.delegate.setDocumentUnavailable(documentId, unavailable);
  }

  async saveDocumentPageCount(documentId: string, pageCount: number): Promise<void> {
    await this.bridge.invoke('documents.updatePageCount', { documentId, pageCount });
    this.items = this.items.map((item) =>
      updateDocumentInItem(item, documentId, (document) => ({
        ...document,
        totalPages: pageCount,
      })),
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

  async search(query: string, filter: SearchFilter): Promise<SearchResult[]> {
    const hits = await this.bridge.invoke('catalog.search', {
      text: query,
      filter,
      limit: 200,
      offset: 0,
    });
    return hits.map((hit) => ({ ...hit }));
  }
}

function getDocumentsFromItem(item: LibraryItem): Document[] {
  if (item.type === 'document') return [item];
  if (item.type !== 'course') return [];
  return [...(item.documents ?? []), ...item.modules.flatMap((module) => module.documents ?? [])];
}

function updateDocumentInItem(
  item: LibraryItem,
  documentId: string,
  update: (document: Document) => Document,
): LibraryItem {
  if (item.type === 'document') return item.id === documentId ? update(item) : item;
  if (item.type !== 'course') return item;
  return {
    ...item,
    documents: item.documents?.map((document) =>
      document.id === documentId ? update(document) : document,
    ),
    modules: item.modules.map((module) => ({
      ...module,
      documents: module.documents?.map((document) =>
        document.id === documentId ? update(document) : document,
      ),
    })),
  };
}
