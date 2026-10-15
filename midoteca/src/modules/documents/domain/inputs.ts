import type { TitleSource } from '../../../core/title-source';

export interface CreateDocument {
  id?: string;
  mediaFileId: string;
  title: string;
  pageCount?: number | null;
  detectedTitle?: string | null;
  titleSource?: TitleSource;
}

export interface CreateDocumentLink {
  id?: string;
  documentId: string;
  courseId?: string | null;
  moduleId?: string | null;
  lessonId?: string | null;
}

/** Renames a document. A title change is treated as a manual edit. */
export interface UpdateDocument {
  id: string;
  title?: string;
  titleSource?: TitleSource;
  pageCount?: number | null;
}
