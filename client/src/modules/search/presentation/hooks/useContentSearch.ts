import { useEffect, useState } from 'react';
import type { ContentHitView } from '@/modules/search/domain/content-search';
import { useContentSearchRepository } from '@/modules/search/presentation/ContentSearchProvider';

const MIN_CHARS = 2;
const DEBOUNCE_MS = 250;

/** Consulta o backend após uma pausa na digitação; só estado transitório de tela. */
export function useContentSearch(query: string): { hits: ContentHitView[]; loading: boolean } {
  const repository = useContentSearchRepository();
  const [hits, setHits] = useState<ContentHitView[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (term.length < MIN_CHARS) {
      setHits([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      repository
        .search(term)
        .then((next) => {
          if (active) setHits(next);
        })
        .catch(() => {
          if (active) setHits([]);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [repository, query]);

  return { hits, loading };
}
