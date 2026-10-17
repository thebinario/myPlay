import type {
  Course,
  Document,
  LibraryItem,
  Movie,
  SearchFilter,
  SearchResult,
} from '@/core/domain/library';

export function searchLibraryItems(
  items: LibraryItem[],
  query: string,
  filter: SearchFilter,
  getPlaybackPosition: (courseId: string, lessonId: string) => number,
): SearchResult[] {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];
  const results: SearchResult[] = [];
  const courses = items.filter((item): item is Course => item.type === 'course');
  const movies = items.filter((item): item is Movie => item.type === 'movie');
  const documents = [
    ...new Map(items.flatMap(documentsInItem).map((doc) => [doc.id, doc])).values(),
  ];

  courses.forEach((course) =>
    results.push(...searchCourse(course, normalizedQuery, filter, getPlaybackPosition)),
  );
  if (filter === 'all' || filter === 'movie') {
    movies
      .filter((movie) =>
        matches([movie.title, movie.description, movie.category, ...movie.tags], normalizedQuery),
      )
      .forEach((movie) =>
        results.push({
          kind: 'movie',
          itemId: movie.id,
          title: movie.title,
          context: movie.description,
          available: true,
          progressLabel: movie.progress > 0 ? `${movie.progress}% assistido` : undefined,
          coverUrl: movie.coverUrl,
        }),
      );
  }
  if (filter === 'all' || filter === 'document') {
    documents
      .filter((document) =>
        matches(
          [document.title, document.description, document.category, ...document.tags],
          normalizedQuery,
        ),
      )
      .forEach((document) =>
        results.push({
          kind: 'document',
          itemId: document.id,
          title: document.title,
          context: document.description,
          available: !document.isUnavailable,
          progressLabel:
            document.lastReadPage > 1
              ? `Página ${document.lastReadPage} de ${document.totalPages}`
              : undefined,
          coverUrl: document.coverUrl,
        }),
      );
  }
  return results;
}

function searchCourse(
  course: Course,
  query: string,
  filter: SearchFilter,
  getPlaybackPosition: (courseId: string, lessonId: string) => number,
): SearchResult[] {
  if (filter !== 'all' && filter !== 'course' && filter !== 'lesson') return [];
  const results: SearchResult[] = [];
  if (
    (filter === 'all' || filter === 'course') &&
    matches([course.title, course.description, course.category, ...course.tags], query)
  ) {
    results.push({
      kind: 'course',
      itemId: course.id,
      title: course.title,
      context: course.description,
      available: true,
      progressLabel: course.progress > 0 ? `${course.progress}% concluído` : undefined,
      coverUrl: course.coverUrl,
    });
  }
  if (filter === 'all' || filter === 'lesson') {
    course.modules.forEach((module) =>
      module.lessons.forEach((lesson) => {
        if (!matches([lesson.title, module.title], query)) return;
        const position = getPlaybackPosition(course.id, lesson.id);
        results.push({
          kind: 'lesson',
          itemId: lesson.id,
          lessonId: lesson.id,
          moduleId: module.id,
          courseId: course.id,
          title: lesson.title,
          context: `${course.title} • ${module.title}`,
          available: !lesson.isUnavailable,
          progressLabel: lesson.completed
            ? 'Concluída'
            : position
              ? `Retomar em ${Math.floor(position / 60)}min`
              : undefined,
          coverUrl: course.coverUrl,
        });
      }),
    );
  }
  return results;
}

function documentsInItem(item: LibraryItem): Document[] {
  if (item.type === 'document') return [item];
  if (item.type !== 'course') return [];
  return [...(item.documents ?? []), ...item.modules.flatMap((module) => module.documents ?? [])];
}

function matches(values: string[], query: string): boolean {
  const needle = normalize(query);
  return values.some((value) => normalize(value).includes(needle));
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
