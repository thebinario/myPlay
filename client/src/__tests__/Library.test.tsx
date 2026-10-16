import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LibraryView } from '@/modules/library/presentation/LibraryView';
import { MOCK_LIBRARY, MOCK_COURSES } from '@/modules/library/infrastructure/mock-library-repository';

describe('MIDOTECA - Tela da Biblioteca', () => {
  it('deve listar os itens da biblioteca com título, categoria e progresso', () => {
    const handleSelectCourse = vi.fn();
    render(<LibraryView items={MOCK_LIBRARY} onSelectCourse={handleSelectCourse} />);

    // Título do curso existente
    expect(screen.getByText('Arquitetura Desktop Moderna com Tauri & React')).toBeInTheDocument();
    // Título de filme
    expect(screen.getByText('The Code: A História do Software Livre')).toBeInTheDocument();
    // Título de documento
    expect(screen.getByText('Clean Architecture para Aplicações Frontend.pdf')).toBeInTheDocument();
  });

  it('deve filtrar itens ao clicar na aba Cursos', () => {
    const handleSelectCourse = vi.fn();
    render(<LibraryView items={MOCK_LIBRARY} onSelectCourse={handleSelectCourse} />);

    // Clica na aba "Cursos"
    const coursesTab = screen.getByRole('tab', { name: /cursos/i });
    fireEvent.click(coursesTab);

    // Deve exibir cursos
    expect(screen.getByText('Arquitetura Desktop Moderna com Tauri & React')).toBeInTheDocument();
    // Não deve mais exibir filmes ou documentos
    expect(screen.queryByText('The Code: A História do Software Livre')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Clean Architecture para Aplicações Frontend.pdf'),
    ).not.toBeInTheDocument();
  });

  it('deve filtrar itens pelo campo de busca', () => {
    const handleSelectCourse = vi.fn();
    render(<LibraryView items={MOCK_LIBRARY} onSelectCourse={handleSelectCourse} />);

    const searchInput = screen.getByPlaceholderText(/buscar em cursos, filmes e documentos/i);
    fireEvent.change(searchInput, { target: { value: 'Vitest' } });

    // Curso correspondente deve aparecer
    expect(screen.getByText(/Testes Automatizados com Vitest/i)).toBeInTheDocument();
    // Outros itens não devem aparecer
    expect(screen.queryByText('The Code: A História do Software Livre')).not.toBeInTheDocument();
  });

  it('deve chamar onSelectCourse ao clicar em um card de curso', () => {
    const handleSelectCourse = vi.fn();
    render(<LibraryView items={MOCK_LIBRARY} onSelectCourse={handleSelectCourse} />);

    const courseCard = screen.getByText('Arquitetura Desktop Moderna com Tauri & React');
    fireEvent.click(courseCard);

    expect(handleSelectCourse).toHaveBeenCalledTimes(1);
    expect(handleSelectCourse).toHaveBeenCalledWith(MOCK_COURSES[0].id);
  });

  it('deve mostrar duração e quantidade de PDFs no card do curso', () => {
    const course = { ...MOCK_COURSES[0], totalDuration: 3720, pdfCount: 13 };
    render(<LibraryView items={[course]} onSelectCourse={vi.fn()} />);

    expect(screen.getByText(/1h\s*2m/)).toBeInTheDocument();
    expect(screen.getByText(/13 PDFs/)).toBeInTheDocument();
  });

  it('não exibe progresso infinito quando a contagem do PDF ainda não foi catalogada', () => {
    const document = { ...MOCK_LIBRARY.find((item) => item.type === 'document')!, totalPages: 0 };
    render(<LibraryView items={[document]} onSelectCourse={vi.fn()} />);

    expect(screen.queryByText('Infinity%')).not.toBeInTheDocument();
    expect(screen.getAllByText('Páginas não catalogadas')).toHaveLength(2);
  });
});
