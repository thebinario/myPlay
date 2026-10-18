import {
  Course,
  Movie,
  Document,
  LibraryItem,
  SubtitleTrack,
  PdfReadingState,
  PdfPageChunk,
  SearchResult,
  SearchFilter,
  ISearchService,
} from '@/core/domain/library';
import type { LibraryRepository } from '@/core/ports/libraryRepository';
import type { Collection } from '@/core/domain/collection';
import {
  MOCK_COLLECTIONS,
  MOCK_COLLECTION_COURSES,
} from '@/modules/library/infrastructure/mock-collections';
import { searchLibraryItems } from '@/modules/search/application/search-library-items';
import {
  STORAGE_VERSION,
  type LibraryStorage,
} from '@/modules/library/infrastructure/library-storage';

export const MOCK_COURSES: Course[] = [
  {
    id: 'course-react-desktop',
    type: 'course',
    title: 'Arquitetura Desktop Moderna com Tauri & React',
    description:
      'Aprenda a construir aplicativos desktop de alta performance utilizando React, TypeScript, Rust e Tauri com TDD e design minimalista.',
    category: 'Desenvolvimento',
    coverUrl:
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
    totalDuration: 3548,
    progress: 45,
    tags: ['React', 'Tauri', 'TypeScript', 'Desktop'],
    createdAt: '2026-02-10T10:00:00Z',
    lastAccessedAt: '2026-10-14T19:30:00Z',
    modules: [
      {
        id: 'mod-1',
        courseId: 'course-react-desktop',
        title: 'Módulo 1: Fundamentos e Arquitetura',
        order: 1,
        lessons: [
          {
            id: 'les-1-1',
            moduleId: 'mod-1',
            title: '1.1 Visão Geral e Comparação com Electron',
            duration: 596,
            completed: true,
            videoUrl: '/media/videos/big-buck-bunny.mp4',
            order: 1,
            lastPlaybackPosition: 120, // 2 minutos já assistidos
            subtitles: [
              {
                id: 'sub-pt',
                label: 'Português (Brasil)',
                language: 'pt-BR',
                isDefault: true,
                content: 'Nesta aula discutiremos Tauri vs Electron.',
              },
              {
                id: 'sub-en',
                label: 'English',
                language: 'en',
                content: 'In this lesson we compare Tauri with Electron.',
              },
              {
                id: 'sub-es',
                label: 'Español',
                language: 'es',
                content: 'En esta lección comparamos Tauri con Electron.',
              },
            ],
            materials: [
              {
                id: 'mat-1',
                title: 'Apostila Arquitetura Tauri vs Electron.pdf',
                type: 'pdf',
                fileSize: '2.4 MB',
                url: '/materials/tauri-vs-electron.pdf',
              },
              {
                id: 'mat-2',
                title: 'Repositório de Exemplos e Boilerplate',
                type: 'code',
                url: 'https://github.com/example/tauri-starter',
              },
            ],
          },
          {
            id: 'les-1-2',
            moduleId: 'mod-1',
            title: '1.2 Configuração do Ambiente e Hot Reload',
            duration: 734,
            completed: true,
            videoUrl: '/media/videos/tears-of-steel.mp4',
            order: 2,
            materials: [
              {
                id: 'mat-3',
                title: 'Guia de Instalação no macOS e Linux.pdf',
                type: 'pdf',
                fileSize: '1.1 MB',
                url: '/materials/macos-linux-setup.pdf',
              },
            ],
          },
          {
            id: 'les-1-3',
            moduleId: 'mod-1',
            title: '1.3 IPC: Comunicação Frontend e Backend Seguro',
            duration: 888,
            completed: false,
            videoUrl: '/media/videos/sintel.mp4',
            order: 3,
            materials: [
              {
                id: 'mat-4',
                title: 'Diagrama de Fluxo de Mensagens IPC',
                type: 'note',
                url: '/materials/ipc-flow.md',
              },
            ],
          },
        ],
      },
      {
        id: 'mod-2',
        courseId: 'course-react-desktop',
        title: 'Módulo 2: Interface Minimalista e Design System',
        order: 2,
        lessons: [
          {
            id: 'les-2-1',
            moduleId: 'mod-2',
            title: '2.1 Paleta Escura #0D111B e Contraste Violeta #A594FF',
            duration: 596,
            completed: false,
            videoUrl: '/media/videos/big-buck-bunny.mp4',
            order: 1,
            materials: [
              {
                id: 'mat-5',
                title: 'Tokens de Cores e Tipografia.pdf',
                type: 'pdf',
                fileSize: '850 KB',
                url: '/materials/design-tokens.pdf',
              },
            ],
          },
          {
            id: 'les-2-2',
            moduleId: 'mod-2',
            title: '2.2 Componentes Compactos e Sidebar de Alta Densidade',
            duration: 734,
            completed: false,
            videoUrl: '/media/videos/tears-of-steel.mp4',
            order: 2,
            materials: [],
          },
        ],
      },
    ],
  },
  {
    id: 'course-tdd-react',
    type: 'course',
    title: 'Testes Automatizados com Vitest & React Testing Library',
    description:
      'Domine a metodologia TDD (Red, Green, Refactor) construindo aplicações reais e à prova de regressão.',
    category: 'Engenharia',
    coverUrl:
      'https://images.unsplash.com/photo-1516116211227-bbc677464010?w=600&auto=format&fit=crop&q=80',
    totalDuration: 1484,
    progress: 75,
    tags: ['TDD', 'Vitest', 'Testing Library', 'Jest'],
    createdAt: '2026-01-15T08:00:00Z',
    lastAccessedAt: '2026-10-12T14:15:00Z',
    modules: [
      {
        id: 'mod-tdd-1',
        courseId: 'course-tdd-react',
        title: 'Módulo 1: O Ciclo Red-Green-Refactor',
        order: 1,
        lessons: [
          {
            id: 'les-tdd-1',
            moduleId: 'mod-tdd-1',
            title: '1.1 O mindset de testar comportamento vs implementação',
            duration: 888,
            completed: true,
            videoUrl: '/media/videos/sintel.mp4',
            order: 1,
            materials: [
              {
                id: 'mat-tdd-1',
                title: 'Cheat Sheet Vitest.pdf',
                type: 'pdf',
                fileSize: '650 KB',
                url: '/materials/vitest-cheatsheet.pdf',
              },
            ],
          },
          {
            id: 'les-tdd-2',
            moduleId: 'mod-tdd-1',
            title: '1.2 Consultas semânticas: getByRole e getByText',
            duration: 596,
            completed: true,
            videoUrl: '/media/videos/big-buck-bunny.mp4',
            order: 2,
            materials: [],
          },
        ],
      },
    ],
  },
  {
    id: 'course-ui-ux',
    type: 'course',
    title: 'Design System Escuro & Microinterações',
    description:
      'Criação de interfaces premium com foco em legibilidade, contraste e feedback tátil em desktops.',
    category: 'Design',
    coverUrl:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    totalDuration: 734,
    progress: 0,
    tags: ['UI/UX', 'Figma', 'CSS', 'Design System'],
    createdAt: '2026-03-01T12:00:00Z',
    modules: [
      {
        id: 'mod-ui-1',
        courseId: 'course-ui-ux',
        title: 'Módulo 1: Fundações de Cores e Tokens',
        order: 1,
        lessons: [
          {
            id: 'les-ui-1',
            moduleId: 'mod-ui-1',
            title: '1.1 O papel do preto puro vs superfícies escuras',
            duration: 734,
            completed: false,
            videoUrl: '/media/videos/tears-of-steel.mp4',
            order: 1,
            materials: [],
          },
        ],
      },
    ],
  },
];

export const MOCK_MOVIES: Movie[] = [
  {
    id: 'movie-open-source',
    type: 'movie',
    title: 'The Code: A História do Software Livre',
    description:
      'Documentário cinematográfico sobre a revolução do código aberto e a evolução dos sistemas operacionais.',
    category: 'Documentário',
    coverUrl:
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80',
    duration: 734, // 12:14
    progress: 30,
    videoUrl: '/media/videos/tears-of-steel.mp4',
    tags: ['Linux', 'Open Source', 'História'],
    createdAt: '2026-01-20T18:00:00Z',
  },
  {
    id: 'movie-future-ai',
    type: 'movie',
    title: 'Fronteiras da Computação',
    description:
      'Exploração dos avanços em hardware neural e arquiteturas modernas de processamento local.',
    category: 'Tecnologia',
    coverUrl:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
    duration: 596, // 9:56
    progress: 0,
    videoUrl: '/media/videos/big-buck-bunny.mp4',
    tags: ['AI', 'Hardware', 'Inovação'],
    createdAt: '2026-02-05T20:00:00Z',
  },
];

export const MOCK_DOCUMENTS: Document[] = [
  {
    id: 'doc-clean-architecture',
    type: 'document',
    title: 'Clean Architecture para Aplicações Frontend.pdf',
    description:
      'Guia de desacoplamento, inversão de controle e estruturação de serviços independentes.',
    category: 'Livros',
    coverUrl:
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80',
    totalPages: 120,
    lastReadPage: 34,
    fileUrl: '/media/docs/think-python.pdf',
    tags: ['Arquitetura', 'Clean Code'],
    createdAt: '2026-01-10T11:00:00Z',
  },
  {
    id: 'doc-tauri-spec',
    type: 'document',
    title: 'Tauri Security Principles & Capabilities.pdf',
    description:
      'Documento de especificação de segurança e sandbox para desenvolvimento em Tauri v2.',
    category: 'Manuais',
    coverUrl:
      'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80',
    totalPages: 48,
    lastReadPage: 12,
    fileUrl: '/media/docs/think-stats.pdf',
    tags: ['Segurança', 'Tauri', 'Rust'],
    createdAt: '2026-02-18T15:30:00Z',
  },
];

export const MOCK_LIBRARY: LibraryItem[] = [
  ...MOCK_COURSES,
  ...MOCK_COLLECTION_COURSES,
  ...MOCK_MOVIES,
  ...MOCK_DOCUMENTS,
];

export class MockLibraryService implements LibraryRepository {
  private items: LibraryItem[] = JSON.parse(JSON.stringify(MOCK_LIBRARY));
  private listeners = new Set<() => void>();

  constructor(private storage?: LibraryStorage) {
    const persisted = storage?.load();
    if (persisted) {
      this.items = persisted.items;
      persisted.playbackPositions.forEach(([key, value]) => this.playbackPositions.set(key, value));
      persisted.subtitlePreferences.forEach(([key, value]) =>
        this.subtitlePreferences.set(key, value),
      );
      persisted.readingStates.forEach(([key, value]) => this.pdfReadingStates.set(key, value));
    }
  }

  /** Persiste o estado atual via porta de storage (se configurada). */
  private persist(): void {
    this.storage?.save({
      version: STORAGE_VERSION,
      items: this.items,
      playbackPositions: [...this.playbackPositions.entries()],
      subtitlePreferences: [...this.subtitlePreferences.entries()],
      readingStates: [...this.pdfReadingStates.entries()],
    });
  }

  /** Assina mudanças do catálogo (não dispara para estado de reprodução/leitura). */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    this.items = [...this.items];
    this.persist();
    this.listeners.forEach((listener) => listener());
  }

  /** Restaura o catálogo e os estados auxiliares ao estado inicial (uso em testes). */
  resetAll(): void {
    this.items = JSON.parse(JSON.stringify(MOCK_LIBRARY));
    this.playbackPositions.clear();
    this.subtitlePreferences.clear();
    this.pdfReadingStates.clear();
    this.storage?.clear();
    this.emit();
  }

  getItems(type: 'all' | 'course' | 'movie' | 'document' = 'all'): LibraryItem[] {
    if (type === 'all') return this.items;
    return this.items.filter((item) => item.type === type);
  }

  getCollections(): Collection[] {
    return MOCK_COLLECTIONS;
  }

  getItemById(id: string): LibraryItem | undefined {
    return this.items.find((item) => item.id === id);
  }

  getCourseById(id: string): Course | undefined {
    const item = this.items.find((i) => i.id === id && i.type === 'course');
    return item as Course | undefined;
  }

  toggleLessonCompletion(courseId: string, lessonId: string): Course | undefined {
    const course = this.getCourseById(courseId);
    if (!course) return undefined;

    let totalLessons = 0;
    let completedLessons = 0;
    const modules = course.modules.map((module) => {
      const lessons = module.lessons.map((lesson) => {
        const completed = lesson.id === lessonId ? !lesson.completed : lesson.completed;
        totalLessons += 1;
        if (completed) completedLessons += 1;
        return lesson.id === lessonId ? { ...lesson, completed } : lesson;
      });
      return { ...module, lessons };
    });

    const updated: Course = {
      ...course,
      modules,
      progress: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
    };
    this.replaceItem(updated);
    this.emit();
    return updated;
  }

  private replaceItem(item: LibraryItem): void {
    const index = this.items.findIndex((i) => i.id === item.id);
    if (index >= 0) {
      this.items = [...this.items.slice(0, index), item, ...this.items.slice(index + 1)];
    }
  }

  private replaceDocument(document: Document): void {
    const direct = this.items.some((item) => item.type === 'document' && item.id === document.id);
    if (direct) {
      this.replaceItem(document);
      return;
    }
    this.items = this.items.map((item) =>
      item.type !== 'course'
        ? item
        : {
            ...item,
            documents: item.documents?.map((candidate) =>
              candidate.id === document.id ? document : candidate,
            ),
            modules: item.modules.map((module) => ({
              ...module,
              documents: module.documents?.map((candidate) =>
                candidate.id === document.id ? document : candidate,
              ),
            })),
          },
    );
  }

  searchItems(query: string, type: 'all' | 'course' | 'movie' | 'document' = 'all'): LibraryItem[] {
    const lower = query.toLowerCase().trim();
    const baseItems = this.getItems(type);
    if (!lower) return baseItems;

    return baseItems.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(lower);
      const matchDesc = item.description.toLowerCase().includes(lower);
      const matchCategory = item.category.toLowerCase().includes(lower);
      const matchTags = item.tags.some((t) => t.toLowerCase().includes(lower));
      return matchTitle || matchDesc || matchCategory || matchTags;
    });
  }

  // --- MÉTODOS PARA ENTREGA 02: EDITOR E PLAYER ---

  private playbackPositions = new Map<string, number>();
  private subtitlePreferences = new Map<string, string | null>();

  saveCourse(course: Course): Course {
    // Recalcula duração total e progresso sem mutar o objeto recebido
    let totalSec = 0;
    let totalLessons = 0;
    let completedLessons = 0;

    course.modules.forEach((m) => {
      m.lessons.forEach((l) => {
        totalSec += l.duration || 0;
        totalLessons += 1;
        if (l.completed) completedLessons += 1;
      });
    });

    const saved: Course = {
      ...course,
      totalDuration: totalSec,
      progress: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
    };

    this.replaceItem(saved);
    this.emit();
    return saved;
  }

  savePlaybackPosition(courseId: string, lessonId: string, positionSeconds: number): void {
    // Estado de reprodução não altera o catálogo (evita re-render global por segundo)
    this.playbackPositions.set(`${courseId}:${lessonId}`, positionSeconds);
    this.persist();
  }

  getPlaybackPosition(courseId: string, lessonId: string): number {
    const key = `${courseId}:${lessonId}`;
    if (this.playbackPositions.has(key)) {
      return this.playbackPositions.get(key)!;
    }
    const course = this.getCourseById(courseId);
    if (course) {
      for (const m of course.modules) {
        for (const l of m.lessons) {
          if (l.id === lessonId && l.lastPlaybackPosition) {
            return l.lastPlaybackPosition;
          }
        }
      }
    }
    return 0;
  }

  saveSubtitlePreference(courseId: string, lessonId: string, subtitleId: string | null): void {
    const key = `${courseId}:${lessonId}`;
    this.subtitlePreferences.set(key, subtitleId);
    this.persist();
  }

  getSubtitlePreference(courseId: string, lessonId: string): string | null {
    const key = `${courseId}:${lessonId}`;
    if (this.subtitlePreferences.has(key)) {
      return this.subtitlePreferences.get(key)!;
    }
    return null;
  }

  addCustomSubtitle(courseId: string, lessonId: string, subtitle: SubtitleTrack): void {
    const course = this.getCourseById(courseId);
    if (!course) return;
    const modules = course.modules.map((m) => ({
      ...m,
      lessons: m.lessons.map((l) =>
        l.id === lessonId ? { ...l, subtitles: [...(l.subtitles ?? []), subtitle] } : l,
      ),
    }));
    this.replaceItem({ ...course, modules });
    this.emit();
  }

  resetCourse(courseId: string): Course | undefined {
    const original = MOCK_COURSES.find((c) => c.id === courseId);
    if (original) {
      return this.saveCourse(JSON.parse(JSON.stringify(original)));
    }
    return undefined;
  }

  // --- MÉTODOS PARA ETAPA 3A: LEITOR DE PDF ---

  private pdfReadingStates = new Map<string, PdfReadingState>();

  getDocumentById(id: string): Document | undefined {
    return this.items
      .flatMap((item) =>
        item.type === 'document'
          ? [item]
          : item.type === 'course'
            ? [
                ...(item.documents ?? []),
                ...item.modules.flatMap((module) => module.documents ?? []),
              ]
            : [],
      )
      .find((document) => document.id === id);
  }

  saveDocumentReadingState(docId: string, state: PdfReadingState): void {
    this.pdfReadingStates.set(docId, { ...state });
    const doc = this.getDocumentById(docId);
    if (!doc) {
      this.persist();
      return;
    }
    // Atualiza o catálogo apenas quando a página muda (rolagem/zoom não re-renderizam a Home)
    const next: Document = {
      ...doc,
      readingState: { ...state },
      lastReadPage: state.currentPage,
      isRead: !!state.completedAt,
    };
    if (doc.lastReadPage !== state.currentPage || doc.isRead !== next.isRead) {
      this.replaceDocument(next);
      this.emit();
    } else {
      this.persist();
    }
  }

  getDocumentReadingState(docId: string): PdfReadingState {
    if (this.pdfReadingStates.has(docId)) {
      return { ...this.pdfReadingStates.get(docId)! };
    }
    const doc = this.getDocumentById(docId);
    if (doc && doc.readingState) {
      return { ...doc.readingState };
    }
    return {
      currentPage: doc?.lastReadPage || 1,
      relativeScrollPosition: 0,
      zoom: 1,
      colorMode: 'dark',
    };
  }

  setDocumentUnavailable(docId: string, unavailable: boolean): void {
    const doc = this.getDocumentById(docId);
    if (doc && doc.isUnavailable !== unavailable) {
      this.replaceItem({ ...doc, isUnavailable: unavailable });
      this.emit();
    }
  }

  async saveDocumentPageCount(docId: string, pageCount: number): Promise<void> {
    const document = this.getDocumentById(docId);
    if (document) document.totalPages = pageCount;
  }

  // Simula carregamento parcial de páginas (preparado para HTTP Range / range-based streaming)
  async fetchPageRange(docId: string, startPage: number, endPage: number): Promise<PdfPageChunk[]> {
    const doc = this.getDocumentById(docId);
    if (!doc) {
      throw new Error(`Documento ${docId} não encontrado.`);
    }
    if (doc.isUnavailable) {
      throw new Error(`Documento ${docId} indisponível ou HD desconectado.`);
    }

    // Carrega apenas o intervalo solicitado [startPage, endPage]
    const clampedStart = Math.max(1, startPage);
    const clampedEnd = Math.min(doc.totalPages, endPage);
    const chunks: PdfPageChunk[] = [];

    for (let p = clampedStart; p <= clampedEnd; p++) {
      chunks.push({
        pageNumber: p,
        content: `Conteúdo da Página ${p} do documento "${doc.title}". Estruturação de componentes, inversão de controle e arquitetura desacoplada.`,
        isLoaded: true,
      });
    }

    return chunks;
  }

  resetDocument(docId: string): Document | undefined {
    const original = MOCK_DOCUMENTS.find((d) => d.id === docId);
    if (original) {
      const cloned: Document = JSON.parse(JSON.stringify(original));
      this.replaceItem(cloned);
      this.pdfReadingStates.delete(docId);
      this.emit();
      return cloned;
    }
    return undefined;
  }

  // ─── ETAPA 3B: PESQUISA UNIVERSAL ────────────────────────────────────────────

  search(query: string, filter: SearchFilter = 'all'): Promise<SearchResult[]> {
    return Promise.resolve(
      searchLibraryItems(this.items, query, filter, (courseId, lessonId) =>
        this.getPlaybackPosition(courseId, lessonId),
      ),
    );
  }
}

export const mockLibraryService = new MockLibraryService();

/** Implementação do contrato ISearchService via MockLibraryService */
export class MockSearchService implements ISearchService {
  private svc: MockLibraryService;
  constructor(svc?: MockLibraryService) {
    this.svc = svc ?? mockLibraryService;
  }
  search(query: string, filter: SearchFilter): Promise<SearchResult[]> {
    return this.svc.search(query, filter);
  }
}

export const mockSearchService = new MockSearchService();
