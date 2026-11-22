/**
 * Read model de conteúdo duplicado fornecido pelo núcleo (`media.*`). O
 * frontend não detecta nem agrupa duplicatas: apenas apresenta.
 */
export interface DuplicateLessonView {
  lessonId: string;
  lessonTitle: string;
  courseId: string;
  courseTitle: string;
  watchedRatio: number | null;
  completedAt: string | null;
}

export interface DuplicateMemberView {
  mediaFileId: string;
  sourceId: string;
  relativePath: string;
  mediaType: string;
  fileSize: number | null;
  durationMs: number | null;
  lessons: DuplicateLessonView[];
  documents: Array<{ documentId: string; title: string }>;
}

export interface DuplicateGroupView {
  kind: 'exact' | 'perceptual';
  members: DuplicateMemberView[];
}

export interface MediaAnalysisStatusView {
  pending: number;
  analyzed: number;
  failed: number;
}

export interface DuplicatesRepository {
  listGroups(): Promise<DuplicateGroupView[]>;
  analysisStatus(): Promise<MediaAnalysisStatusView>;
}
