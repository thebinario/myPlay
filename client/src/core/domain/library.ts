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
  documents?: Document[];
  /** Seção à qual o módulo pertence, quando o curso usa `sections`. */
  sectionId?: string;
}

/**
 * Seção de um curso: agrupamento opcional de módulos.
 *
 * Estruturas de pasta reais têm profundidade variável (ex.: `Semana 01/Unidade 01/
 * Aula 01`). O colapso descrito em `docs/HIERARCHY.md` projeta essa variação em
 * `Curso → Seção → Módulo → Aula`, sem árvore genérica.
 */
export interface CourseSection {
  id: string;
  courseId: string;
  title: string;
  order: number;
  modules: CourseModule[];
}

export interface Course {
  id: string;
  sourceId?: string | null;
  type: 'course';
  title: string;
  description: string;
  /** Categoria/área (facet derivada da pasta, ex.: "Programação Front-end"). */
  category: string;
  /** Plataforma de origem (facet, ex.: "Udemy", "Alura", "Hotmart"). */
  provider?: string;
  /** Coleção à qual o curso pertence, quando a fonte organiza por coleções. */
  collectionId?: string | null;
  coverUrl: string;
  totalDuration: number; // segundos
  pdfCount?: number;
  documents?: Document[];
  progress: number; // 0-100
  /**
   * Projeção plana dos módulos para consumidores legados. Quando o curso tem
   * `sections`, este campo é derivado delas (não é fonte independente).
   */
  modules: CourseModule[];
  /** Seções do curso, quando a estrutura de pasta tem agrupamentos. */
  sections?: CourseSection[];
  tags: string[];
  createdAt: string;
  lastAccessedAt?: string;
}

export interface Movie {
  id: string;
  sourceId?: string | null;
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
  lastAccessedAt?: string;
  completedAt?: string | null;
}

export interface PdfPageChunk {
  pageNumber: number;
  content: string;
  isLoaded: boolean;
}

export interface Document {
  id: string;
  sourceId?: string | null;
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
  isRead?: boolean;
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
  sourceId?: string | null;
  relativePath?: string | null;
  filePath?: string | null;
}

/** Contrato desacoplado – preparado para futura implementação SQLite/FTS5 */
export interface ISearchService {
  search(query: string, filter: SearchFilter): Promise<SearchResult[]>;
}
