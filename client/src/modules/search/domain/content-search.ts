/**
 * Trecho de texto (PDF, legenda ou transcrição) encontrado pelo núcleo via
 * FTS5. O frontend não pesquisa nem pontua: apenas apresenta e navega.
 */
export interface ContentHitView {
  chunkId: number;
  sourceKind: 'pdf' | 'subtitle' | 'transcript';
  /** Texto com os termos encontrados entre `[[` e `]]`. */
  snippet: string;
  score: number;
  mediaFileId: string;
  language: string | null;
  documentId: string | null;
  documentTitle: string | null;
  page: number | null;
  lessonId: string | null;
  lessonTitle: string | null;
  courseId: string | null;
  courseTitle: string | null;
  startMs: number | null;
  endMs: number | null;
}

export interface ContentSearchRepository {
  search(text: string): Promise<ContentHitView[]>;
}
