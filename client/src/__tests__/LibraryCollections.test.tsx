import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import type { Course } from '@/core/domain/library';
import type { Collection } from '@/core/domain/collection';
import type { LibrarySource } from '@/core/domain/library-source';
import { LibraryView } from '@/modules/library/presentation/LibraryView';

const source: LibrarySource = {
  id: 'src-1',
  path: '/Volumes/HD',
  name: 'HD',
  status: 'connected',
  itemCount: 0,
  lastScannedAt: null,
};

function course(id: string, title: string, lessonTitle: string): Course {
  return {
    id,
    sourceId: 'src-1',
    type: 'course',
    title,
    description: '',
    category: 'Tecnologia',
    coverUrl: '',
    totalDuration: 60,
    progress: 0,
    tags: [],
    createdAt: '2026-01-01T00:00:00Z',
    collectionId: 'col-1',
    modules: [
      {
        id: `${id}-m1`,
        courseId: id,
        title: 'Módulo 1',
        order: 1,
        lessons: [
          {
            id: `${id}-l1`,
            moduleId: `${id}-m1`,
            title: lessonTitle,
            duration: 60,
            completed: false,
            videoUrl: '',
            order: 1,
            materials: [],
          },
        ],
      },
    ],
  };
}

function collection(courses: Course[]): Collection {
  return {
    id: 'col-1',
    sourceId: 'src-1',
    type: 'collection',
    title: 'Coleção 01 - Tecnologia',
    tags: [],
    createdAt: '2026-01-01T00:00:00Z',
    courseCount: courses.length,
    totalDuration: 0,
    progress: 0,
    courses,
  };
}

function renderLibrary(collections: Collection[]) {
  return render(
    <LibraryView
      items={[]}
      sources={[source]}
      collections={collections}
      onSelectCourse={() => {}}
    />,
  );
}

describe('LibraryView — detalhe da coleção', () => {
  it('mostra a listagem de módulos quando a coleção tem um único curso', () => {
    renderLibrary([collection([course('c1', 'Curso Único', 'Aula do Curso Único')])]);

    fireEvent.click(screen.getByText('Coleção 01 - Tecnologia'));

    expect(screen.getByText('Aula do Curso Único')).toBeInTheDocument();
  });

  it('mostra a grid de cursos quando a coleção tem vários cursos', () => {
    renderLibrary([
      collection([
        course('c1', 'Curso A', 'Aula do Curso A'),
        course('c2', 'Curso B', 'Aula do Curso B'),
      ]),
    ]);

    fireEvent.click(screen.getByText('Coleção 01 - Tecnologia'));

    expect(screen.getByText('Curso A')).toBeInTheDocument();
    expect(screen.getByText('Curso B')).toBeInTheDocument();
    expect(screen.queryByText('Aula do Curso A')).not.toBeInTheDocument();
  });
});

describe('LibraryView — drill-down da fonte', () => {
  it('mostra as coleções da fonte e depois os cursos ao abrir uma coleção', () => {
    renderLibrary([
      collection([
        course('c1', 'Curso A', 'Aula do Curso A'),
        course('c2', 'Curso B', 'Aula do Curso B'),
      ]),
    ]);

    fireEvent.click(screen.getByText('HD'));

    expect(screen.getByText('Coleções')).toBeInTheDocument();
    expect(screen.getByText('Coleção 01 - Tecnologia')).toBeInTheDocument();
    expect(screen.queryByText('Curso A')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Coleção 01 - Tecnologia'));

    expect(screen.getByText('Curso A')).toBeInTheDocument();
    expect(screen.getByText('Curso B')).toBeInTheDocument();
    expect(screen.queryByText('Aula do Curso A')).not.toBeInTheDocument();
  });

  it('mostra cards de curso quando a fonte tem vários cursos e nenhuma coleção', () => {
    render(
      <LibraryView
        items={[course('c1', 'Curso A', 'Aula do Curso A'), course('c2', 'Curso B', 'Aula B')]}
        sources={[source]}
        collections={[]}
        onSelectCourse={() => {}}
      />,
    );

    fireEvent.click(screen.getByText('HD'));

    expect(screen.getByText('Curso A')).toBeInTheDocument();
    expect(screen.getByText('Curso B')).toBeInTheDocument();
    expect(screen.queryByText('Aula do Curso A')).not.toBeInTheDocument();
  });
});
