export type ContentType = 'all' | 'course' | 'movie' | 'document';

export type MaterialType = 'pdf' | 'code' | 'link' | 'note';

export interface Material {
  id: string;
  title: string;
  type: MaterialType;
  fileSize?: string;
  url: string;
}

export interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
  isDefault?: boolean;
  content?: string; // Conteúdo VTT/SRT mockado
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  duration: number; // segundos
  completed: boolean;
  videoUrl: string;
  order: number;
  materials: Material[];
  lastPlaybackPosition?: number; // segundos
  subtitles?: SubtitleTrack[];
  isUnavailable?: boolean; // Para teste de arquivo indisponível / HD desconectado
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  type: 'course';
  title: string;
  description: string;
  category: string;
  coverUrl: string;
  totalDuration: number; // segundos
  progress: number; // 0-100
  modules: CourseModule[];
  tags: string[];
  createdAt: string;
  lastAccessedAt?: string;
}

export interface Movie {
  id: string;
  type: 'movie';
  title: string;
  description: string;
  category: string;
  coverUrl: string;
  duration: number;
  progress: number;
  videoUrl: string;
  tags: string[];
  createdAt: string;
}

export type PdfColorMode = 'dark' | 'original';

export interface PdfReadingState {
  currentPage: number;
  relativeScrollPosition: number; // 0.0 a 1.0
  zoom: number; // ex: 1 = 100%, 1.25 = 125%, 0.8 = 80%
  colorMode: PdfColorMode;
}

export interface PdfPageChunk {
  pageNumber: number;
  content: string;
  isLoaded: boolean;
}

export interface Document {
  id: string;
  type: 'document';
  title: string;
  description: string;
  category: string;
  coverUrl?: string;
  totalPages: number;
  lastReadPage: number;
  fileUrl: string;
  tags: string[];
  createdAt: string;
  readingState?: PdfReadingState;
  isUnavailable?: boolean;
}

export type LibraryItem = Course | Movie | Document;

export type NavigationTab =
  | 'home'
  | 'library'
  | 'course-details'
  | 'player'
  | 'search'
  | 'settings'
  | 'onboarding'
  | 'editor'
  | 'pdf-viewer';

// ─── Pesquisa Universal (Etapa 3B) ───────────────────────────────────────────

export type SearchResultKind = 'course' | 'lesson' | 'movie' | 'document';
export type SearchFilter = 'all' | SearchResultKind;

export interface SearchResult {
  /** Tipo do resultado */
  kind: SearchResultKind;
  /** ID do item raiz (curso, filme, documento) */
  itemId: string;
  /** Se for aula, ID da aula */
  lessonId?: string;
  /** Se for aula, ID do módulo pai */
  moduleId?: string;
  /** Se for aula, ID do curso pai */
  courseId?: string;
  title: string;
  /** Texto de contexto exibido abaixo do título */
  context: string;
  /** Indica se o arquivo está disponível localmente */
  available: boolean;
  /** Progresso 0-100 (para cursos, filmes) ou página atual (para docs) */
  progressLabel?: string;
  coverUrl?: string;
}

/** Contrato desacoplado – preparado para futura implementação SQLite/FTS5 */
export interface ISearchService {
  search(query: string, filter: SearchFilter): SearchResult[];
}
