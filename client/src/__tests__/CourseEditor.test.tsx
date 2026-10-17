import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CourseEditorView } from '@/modules/courses/presentation/CourseEditorView';
import {
  MOCK_COURSES,
  mockLibraryService,
} from '@/modules/library/infrastructure/mock-library-repository';
import { Course } from '@/core/domain/library';

describe('MIDOTECA - Entrega 02: Editor de Cursos (Tela 09)', () => {
  let sampleCourse: Course;

  beforeEach(() => {
    // Clonagem profunda para isolamento de cada teste
    sampleCourse = JSON.parse(JSON.stringify(MOCK_COURSES[0]));
    mockLibraryService.resetCourse(sampleCourse.id);
  });

  it('deve permitir editar o título do curso diretamente no título inline', () => {
    const handleSave = vi.fn();
    const handleBack = vi.fn();

    render(
      <CourseEditorView initialCourse={sampleCourse} onSave={handleSave} onBack={handleBack} />,
    );

    // O título inicial deve estar presente
    const titleInput = screen.getByDisplayValue(sampleCourse.title);
    expect(titleInput).toBeInTheDocument();

    // Altera o título diretamente inline
    fireEvent.change(titleInput, { target: { value: 'Curso Atualizado de Tauri & React' } });
    expect(screen.getByDisplayValue('Curso Atualizado de Tauri & React')).toBeInTheDocument();
  });

  it('deve permitir editar o título de um módulo e de uma aula diretamente inline', () => {
    render(<CourseEditorView initialCourse={sampleCourse} onSave={vi.fn()} onBack={vi.fn()} />);

    // Edita o nome do módulo 1
    const moduleInput = screen.getByLabelText(/título do módulo 1/i);
    fireEvent.change(moduleInput, { target: { value: 'Módulo 1: Arquitetura Modificada' } });
    expect(moduleInput).toHaveValue('Módulo 1: Arquitetura Modificada');

    // Edita o nome da aula 1.1
    const lessonInput = screen.getByLabelText(/título da aula 1\.1 visão geral/i);
    fireEvent.change(lessonInput, { target: { value: '1.1 Visão Geral do Ecossistema Desktop' } });
    expect(lessonInput).toHaveValue('1.1 Visão Geral do Ecossistema Desktop');
  });

  it('deve permitir reordenar módulos usando controles acessíveis', () => {
    render(<CourseEditorView initialCourse={sampleCourse} onSave={vi.fn()} onBack={vi.fn()} />);

    // Botão para mover o módulo 1 para baixo
    const moveDownBtn = screen.getByRole('button', {
      name: /mover módulo "módulo 1: fundamentos e arquitetura" para baixo/i,
    });
    fireEvent.click(moveDownBtn);

    // Agora o Módulo 2 deve ser o primeiro da lista
    const moduleInputs = screen.getAllByLabelText(/título do módulo/i);
    expect(moduleInputs[0]).toHaveValue('Módulo 2: Interface Minimalista e Design System');
    expect(moduleInputs[1]).toHaveValue('Módulo 1: Fundamentos e Arquitetura');
  });

  it('deve permitir mover uma aula para outro módulo', () => {
    render(<CourseEditorView initialCourse={sampleCourse} onSave={vi.fn()} onBack={vi.fn()} />);

    // Move a aula 1.1 para o Módulo 2
    const moveLessonSelect = screen.getByLabelText(
      /mover aula "1.1 visão geral e comparação com electron" para o módulo/i,
    );
    fireEvent.change(moveLessonSelect, { target: { value: 'mod-2' } });

    // Verifica que o Módulo 2 agora contém 3 aulas
    const mod2Section = screen.getByTestId('module-section-mod-2');
    expect(
      within(mod2Section).getByDisplayValue('1.1 Visão Geral e Comparação com Electron'),
    ).toBeInTheDocument();
  });

  it('deve permitir desfazer alterações com botão Desfazer', () => {
    render(<CourseEditorView initialCourse={sampleCourse} onSave={vi.fn()} onBack={vi.fn()} />);

    const titleInput = screen.getByDisplayValue(sampleCourse.title);
    fireEvent.change(titleInput, { target: { value: 'Título Provisório' } });
    expect(screen.getByDisplayValue('Título Provisório')).toBeInTheDocument();

    // Clica no botão Desfazer
    const undoButton = screen.getByRole('button', { name: /desfazer alteração/i });
    fireEvent.click(undoButton);

    // Deve restaurar o título anterior
    expect(screen.getByDisplayValue(sampleCourse.title)).toBeInTheDocument();
  });

  it('deve salvar as alterações no serviço mockado e exibir feedback discreto', async () => {
    const handleSave = vi.fn();

    render(<CourseEditorView initialCourse={sampleCourse} onSave={handleSave} onBack={vi.fn()} />);

    const titleInput = screen.getByDisplayValue(sampleCourse.title);
    fireEvent.change(titleInput, { target: { value: 'Curso Salvo no Mock' } });

    // Clica em Salvar Alterações
    const saveButton = screen.getByRole('button', { name: /salvar alterações/i });
    fireEvent.click(saveButton);

    // Feedback discreto
    expect(await screen.findByText(/alterações salvas com sucesso/i)).toBeInTheDocument();
    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Curso Salvo no Mock',
      }),
    );

    // Verifica persistência no mockLibraryService
    const savedInService = mockLibraryService.getCourseById(sampleCourse.id);
    expect(savedInService?.title).toBe('Curso Salvo no Mock');
  });

  it('deve preservar os IDs, URLs e caminhos de arquivo originais das aulas ao salvar', async () => {
    const handleSave = vi.fn();

    render(<CourseEditorView initialCourse={sampleCourse} onSave={handleSave} onBack={vi.fn()} />);

    const saveButton = screen.getByRole('button', { name: /salvar alterações/i });
    fireEvent.click(saveButton);

    await waitFor(() => expect(handleSave).toHaveBeenCalledOnce());
    const savedCourse = handleSave.mock.calls[0][0] as Course;
    const firstLesson = savedCourse.modules[0].lessons[0];

    // Preservação de atributos originais
    expect(firstLesson.id).toBe('les-1-1');
    expect(firstLesson.videoUrl).toBe(sampleCourse.modules[0].lessons[0].videoUrl);
    expect(firstLesson.materials).toHaveLength(sampleCourse.modules[0].lessons[0].materials.length);
  });
});
