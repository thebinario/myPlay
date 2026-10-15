import type { TitleSource } from '../shared/title-source';

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
