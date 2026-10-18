import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CourseDetailsView } from '@/modules/courses/presentation/CourseDetailsView';
import { MOCK_COURSES } from '@/modules/library/infrastructure/mock-library-repository';
import { MOCK_COLLECTION_COURSES } from '@/modules/library/infrastructure/mock-collections';
import type { Course, CourseModule } from '@/core/domain/library';

describe('MIDOTECA - Tela de Detalhes do Curso', () => {
  const sampleCourse = MOCK_COURSES[0]; // Arquitetura Desktop Moderna com Tauri & React

  it('deve renderizar os dados do curso, incluindo título, descrição e progresso', () => {
    const handleBack = vi.fn();
    const handleToggleLesson = vi.fn();

    render(
      <CourseDetailsView
        course={sampleCourse}
        onBack={handleBack}
        onToggleLesson={handleToggleLesson}
      />,
    );

    // Título e descrição
    expect(screen.getByRole('heading', { name: sampleCourse.title, level: 1 })).toBeInTheDocument();
    expect(screen.getByText(sampleCourse.description)).toBeInTheDocument();

    // Progresso
    expect(screen.getByText(`${sampleCourse.progress}% concluído`)).toBeInTheDocument();

    // Módulos
    expect(screen.getByText('Módulo 1: Fundamentos e Arquitetura')).toBeInTheDocument();
    expect(screen.getByText('Módulo 2: Interface Minimalista e Design System')).toBeInTheDocument();

    // Aulas do primeiro módulo
    expect(screen.getByText('1.1 Visão Geral e Comparação com Electron')).toBeInTheDocument();
  });

  it('deve listar materiais complementares de uma lição', () => {
    const handleBack = vi.fn();
    const handleToggleLesson = vi.fn();

    render(
      <CourseDetailsView
        course={sampleCourse}
        onBack={handleBack}
        onToggleLesson={handleToggleLesson}
      />,
    );

    // Material da primeira lição
    expect(screen.getByText('Apostila Arquitetura Tauri vs Electron.pdf')).toBeInTheDocument();
  });

  it('deve abrir um PDF da grade do módulo pelo identificador do documento', () => {
    const handleOpenDocument = vi.fn();
    const handleToggleDocumentRead = vi.fn();
    const courseWithModulePdf = {
      ...sampleCourse,
      modules: sampleCourse.modules.map((module, index) =>
        index === 0
          ? {
              ...module,
              documents: [
                {
                  id: 'doc-module-1',
                  sourceId: 'source-1',
                  type: 'document' as const,
                  title: 'Apostila do módulo.pdf',
                  description: '',
                  category: '',
                  totalPages: 12,
                  lastReadPage: 1,
                  fileUrl: 'file:///Apostila.pdf',
                  tags: [],
                  createdAt: '',
                },
              ],
            }
          : module,
      ),
    };

    render(
      <CourseDetailsView
        course={courseWithModulePdf}
        onBack={vi.fn()}
        onToggleLesson={vi.fn()}
        onOpenDocument={handleOpenDocument}
        onToggleDocumentRead={handleToggleDocumentRead}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Abrir PDF Apostila do módulo.pdf' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Marcar Apostila do módulo.pdf como lido' }),
    );
    expect(handleOpenDocument).toHaveBeenCalledWith('doc-module-1');
    expect(handleToggleDocumentRead).toHaveBeenCalledWith('doc-module-1');
  });

  it('deve disparar onToggleLesson ao clicar no checkbox de conclusão da aula', () => {
    const handleBack = vi.fn();
    const handleToggleLesson = vi.fn();

    render(
      <CourseDetailsView
        course={sampleCourse}
        onBack={handleBack}
        onToggleLesson={handleToggleLesson}
      />,
    );

    // Botão/checkbox de conclusão da aula 1.3
    const lessonCheckbox = screen.getByLabelText(
      /marcar 1.3 IPC: Comunicação Frontend e Backend Seguro como concluída/i,
    );
    fireEvent.click(lessonCheckbox);

    expect(handleToggleLesson).toHaveBeenCalledWith(sampleCourse.id, 'les-1-3');
  });

  it('deve chamar onBack ao clicar no botão de voltar', () => {
    const handleBack = vi.fn();
    const handleToggleLesson = vi.fn();

    render(
      <CourseDetailsView
        course={sampleCourse}
        onBack={handleBack}
        onToggleLesson={handleToggleLesson}
      />,
    );

    const backButton = screen.getByRole('button', { name: /voltar para a biblioteca/i });
    fireEvent.click(backButton);

    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it('agrupa os módulos por seção quando o curso tem seções', () => {
    const course = MOCK_COLLECTION_COURSES.find((item) => item.id === 'course-unico')!;

    render(<CourseDetailsView course={course} onBack={vi.fn()} onToggleLesson={vi.fn()} />);

    expect(screen.getByRole('heading', { name: '01 - Fundamentos' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '02 - Prática' })).toBeInTheDocument();
    expect(screen.getByText('Módulo 01 - Conceitos')).toBeInTheDocument();
  });

  it('distingue módulos de mesmo título em seções diferentes', () => {
    const lesson = (moduleId: string, id: string, title: string) => ({
      id,
      moduleId,
      title,
      duration: 60,
      completed: false,
      videoUrl: '',
      order: 1,
      materials: [],
    });
    const moduleA: CourseModule = {
      id: 'm-a',
      courseId: sampleCourse.id,
      title: 'Aulas',
      order: 1,
      lessons: [lesson('m-a', 'l-a', 'Aula A')],
    };
    const moduleB: CourseModule = {
      id: 'm-b',
      courseId: sampleCourse.id,
      title: 'Aulas',
      order: 2,
      lessons: [lesson('m-b', 'l-b', 'Aula B')],
    };
    const grouped: Course = {
      ...sampleCourse,
      modules: [moduleA, moduleB],
      sections: [
        { id: 's-a', courseId: sampleCourse.id, title: 'Seção A', order: 1, modules: [moduleA] },
        { id: 's-b', courseId: sampleCourse.id, title: 'Seção B', order: 2, modules: [moduleB] },
      ],
    };

    render(<CourseDetailsView course={grouped} onBack={vi.fn()} onToggleLesson={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Seção A' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Seção B' })).toBeInTheDocument();
    expect(screen.getByText('Aula A')).toBeInTheDocument();
    expect(screen.getByText('Aula B')).toBeInTheDocument();
  });
});
