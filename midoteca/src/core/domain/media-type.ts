/**
 * Media vocabulary shared by 2+ bounded contexts: `media` owns physical files,
 * `indexing` classifies what it discovers. It lives in the shared kernel so no
 * context has to reach into another context's domain
 * (ver `docs/ARCHITECTURE.md` §8).
 */
export type MediaType = 'video' | 'audio' | 'pdf' | 'subtitle' | 'image' | 'other';

export const MEDIA_TYPES: readonly MediaType[] = [
  'video',
  'audio',
  'pdf',
  'subtitle',
  'image',
  'other',
];
