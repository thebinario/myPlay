import { useEffect, useState } from 'react';
import type { StudyCourseLibraryView } from '@/modules/study/domain/study';
import { useStudyRepository } from '@/modules/study/presentation/providers/StudyProvider';
import { errorMessage } from './error-message';

const SEARCH_DELAY_MS = 200;

/**
 * Cursos da biblioteca agrupados por biblioteca para a nova trilha. A pesquisa
 * é feita pelo núcleo; aqui só se espera a digitação assentar.
 */
export function useCourseOptions(query: string) {
  const repository = useStudyRepository();
  const [libraries, setLibraries] = useState<StudyCourseLibraryView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const term = query.trim();
    const timer = setTimeout(
      async () => {
        setLoading(true);
        try {
          const result = await repository.listCourses(term);
          if (cancelled) return;
          setLibraries(result);
          setError(null);
        } catch (cause) {
          if (!cancelled) setError(errorMessage(cause));
        } finally {
          if (!cancelled) setLoading(false);
        }
      },
      term === '' ? 0 : SEARCH_DELAY_MS,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [repository, query]);

  return { libraries, loading, error };
}
