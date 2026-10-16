import type {
  ContentType,
  Course,
  Document,
  ISearchService,
  LibraryItem,
  PdfPageChunk,
  PdfReadingState,
  SubtitleTrack,
} from '@/core/domain/library';

/**
 * Contrato do catálogo da biblioteca (cursos, filmes, documentos).
 *
 * A implementação padrão atual é em memória (`MockLibraryService`), mas o
 * contrato foi desenhado para permitir persistência real (SQLite/HTTP) no
 * futuro sem alterar os consumidores.
 */
export interface LibraryCatalogRepository {
  /** Retorna todos os itens (ou apenas de um tipo). */
  getItems(type?: ContentType): LibraryItem[];
  getItemById(id: string): LibraryItem | undefined;
  getCourseById(id: string): Course | undefined;
  getDocumentById(id: string): Document | undefined;
  /** Persiste um curso editado e notifica os assinantes. */
  saveCourse(course: Course): Course;
  /** Alterna a conclusão de uma aula e recalcula o progresso do curso. */
  toggleLessonCompletion(courseId: string, lessonId: string): Course | undefined;
  /**
   * Assina mudanças do catálogo. Retorna a função de cancelamento.
   * Mutação de estado de reprodução/leitura NÃO dispara assinantes.
   */
  subscribe(listener: () => void): () => void;
}

/** Contrato de estado de reprodução (posições e preferências de legenda). */
export interface PlaybackStateRepository {
  savePlaybackPosition(courseId: string, lessonId: string, positionSeconds: number): void;
  getPlaybackPosition(courseId: string, lessonId: string): number;
  saveSubtitlePreference(courseId: string, lessonId: string, subtitleId: string | null): void;
  getSubtitlePreference(courseId: string, lessonId: string): string | null;
  addCustomSubtitle(courseId: string, lessonId: string, subtitle: SubtitleTrack): void;
}

/** Contrato de estado de leitura de PDF (página, rolagem, zoom e tema). */
export interface ReadingStateRepository {
  getDocumentReadingState(docId: string): PdfReadingState;
  saveDocumentReadingState(docId: string, state: PdfReadingState): void;
  setDocumentUnavailable(docId: string, unavailable: boolean): void;
  saveDocumentPageCount(docId: string, pageCount: number): Promise<void>;
}

/**
 * Provedor de páginas do PDF. A implementação mockada devolve blocos de texto
 * sintéticos; a implementação real poderá usar HTTP Range / pdf.js.
 */
export interface PageProvider {
  fetchPageRange(docId: string, startPage: number, endPage: number): Promise<PdfPageChunk[]>;
}

/** Operações de manutenção do catálogo (ex.: restaurar dados de exemplo). */
export interface LibraryMaintenance {
  resetAll(): void;
}

/** Contrato agregado consumido pela aplicação. */
export interface LibraryRepository
  extends
    LibraryCatalogRepository,
    PlaybackStateRepository,
    ReadingStateRepository,
    PageProvider,
    LibraryMaintenance,
    ISearchService {}
