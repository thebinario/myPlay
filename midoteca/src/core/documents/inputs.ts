export interface CreateDocument {
  id?: string;
  mediaFileId: string;
  title: string;
  pageCount?: number | null;
}

export interface CreateDocumentLink {
  id?: string;
  documentId: string;
  courseId?: string | null;
  moduleId?: string | null;
  lessonId?: string | null;
}
