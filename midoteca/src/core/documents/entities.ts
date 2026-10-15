/**
 * A `Document` is a logical PDF (or other paginated content) backed by a
 * `MediaFile`. Keeping the logical document separate from the physical file
 * allows the same document to be re-linked to a repaired/moved file.
 */
import type { TitleSource } from '../shared/title-source';

export interface Document {
  id: string;
  mediaFileId: string;
  title: string;
  pageCount: number | null;
  /** Last title derived from the filesystem. */
  detectedTitle: string | null;
  titleSource: TitleSource;
}

/**
 * Associates a document with a course, module and/or lesson. All three targets
 * are optional, but at least one must be present (enforced by a CHECK
 * constraint). This models "the same PDF is attached to a course and to
 * specific lessons" without duplicating the document row.
 */
export interface DocumentLink {
  id: string;
  documentId: string;
  courseId: string | null;
  moduleId: string | null;
  lessonId: string | null;
}
