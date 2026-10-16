/**
 * Role a media file plays inside a lesson. Shared by the `courses` context
 * (which owns `LessonMedia`) and `indexing` (which links files to lessons), so
 * it lives in the shared kernel instead of one context's domain
 * (ver `docs/ARCHITECTURE.md` §8).
 */
export type LessonMediaRole = 'primary' | 'supplementary' | 'attachment' | 'subtitle';

export const LESSON_MEDIA_ROLES: readonly LessonMediaRole[] = [
  'primary',
  'supplementary',
  'attachment',
  'subtitle',
];
