import { toFtsQuery } from '../domain/content-chunking';
import type { ContentHit, ContentIndexStatus, ContentIndexStore } from '../domain/ports';

export interface ContentSearchQuery {
  text: string;
  /** Max hits (1..100). Default 20. */
  limit?: number;
}

/** Full-text search over extracted PDF/subtitle/transcript text. */
export class ContentSearchService {
  constructor(private readonly store: ContentIndexStore) {}

  async search(query: ContentSearchQuery): Promise<ContentHit[]> {
    const fts = toFtsQuery(typeof query.text === 'string' ? query.text : '');
    if (!fts) return [];
    const limit = Math.min(100, Math.max(1, Math.floor(query.limit ?? 20)));
    return this.store.search(fts, limit);
  }

  status(): Promise<ContentIndexStatus> {
    return this.store.status();
  }
}
