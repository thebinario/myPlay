import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { LibrarySource } from '@/core/domain/library-source';
import {
  MOCK_COURSES,
  MOCK_LIBRARY,
} from '@/modules/library/infrastructure/mock-library-repository';
import { LibraryView } from '@/modules/library/presentation/LibraryView';
import { LibraryCourseContents } from '@/modules/library/presentation/components/LibraryCourseContents';

describe('conteúdos da biblioteca', () => {
  it('mantém vídeos e PDFs juntos no módulo e permite abrir cada conteúdo', () => {
    const source: LibrarySource = {
      id: 'source-test',
      name: 'Biblioteca de teste',
      path: '/biblioteca',
      libraryType: 'course',
      status: 'connected',
      itemCount: 3,
      lastScannedAt: null,
    };
    const course = {
      ...MOCK_COURSES[0],
      id: 'course-test',
      sourceId: source.id,
      progress: 86,
      documents: [],
      modules: [
        {
          ...MOCK_COURSES[0].modules[0],
          id: 'module-test',
          courseId: 'course-test',
          title: 'Módulo compartilhado',
          lessons: [{ ...MOCK_COURSES[0].modules[0].lessons[0], id: 'lesson-test' }],
          documents: [],
        },
      ],
    };
    const movie = { ...MOCK_LIBRARY.find((item) => item.type === 'movie')!, sourceId: source.id };
    const document = {
      ...MOCK_LIBRARY.find((item) => item.type === 'document')!,
      sourceId: source.id,
    };
    const onPlayLesson = vi.fn();
    const onOpenMovie = vi.fn();
    const onOpenDocument = vi.fn();
    const onSelectCourse = vi.fn();
    const onEditCourse = vi.fn();

    render(
      <LibraryView
        items={[course, movie, document]}
        sources={[source]}
        onSelectCourse={onSelectCourse}
        onPlayLesson={onPlayLesson}
        onOpenMovie={onOpenMovie}
        onOpenDocument={onOpenDocument}
        onEditCourse={onEditCourse}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /abrir biblioteca biblioteca de teste/i }));

    expect(screen.getByText('Módulo')).toBeInTheDocument();
    expect(screen.getByText('2 vídeos · 1 PDFs')).toBeInTheDocument();
    expect(screen.getByText('86% concluído')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Progresso do curso' })).toHaveAttribute(
      'aria-valuenow',
      '86',
    );
    fireEvent.click(screen.getByRole('button', { name: course.title }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar organização do curso' }));
    const playButtons = screen.getAllByRole('button', { name: /reproduzir/i });
    fireEvent.click(playButtons[0]);
    fireEvent.click(playButtons[1]);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(document.title) }));

    expect(onPlayLesson).toHaveBeenCalledWith(course.id, 'lesson-test');
    expect(onSelectCourse).toHaveBeenCalledWith(course.id);
    expect(onEditCourse).toHaveBeenCalledWith(course.id);
    expect(onOpenMovie).toHaveBeenCalledWith(movie.id);
    expect(onOpenDocument).toHaveBeenCalledWith(document.id);
  });

  it('numera os módulos quando o curso possui mais de um', () => {
    const course = {
      ...MOCK_COURSES[0],
      modules: MOCK_COURSES[0].modules.slice(0, 2),
    };

    render(<LibraryCourseContents course={course} onSelectCourse={vi.fn()} />);

    expect(screen.getByText('Módulo 1')).toBeInTheDocument();
    expect(screen.getByText('Módulo 2')).toBeInTheDocument();
  });
});
