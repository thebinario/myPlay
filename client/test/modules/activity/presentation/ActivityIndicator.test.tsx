import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ActivityIndicator } from '@/modules/activity/presentation/ActivityIndicator';
import type { ActivitySnapshotView } from '@/modules/activity/domain/activity';

const idle: ActivitySnapshotView = { items: [], running: 0, queued: 0 };
const busy: ActivitySnapshotView = {
  running: 2,
  queued: 1,
  items: [
    {
      id: 'scan:1',
      kind: 'scan',
      status: 'running',
      label: 'Analisando biblioteca — Cursos',
      percent: null,
      detail: 'Módulo 2/aula.mp4',
    },
    {
      id: 'job-1',
      kind: 'transcription',
      status: 'running',
      label: 'Transcrevendo vídeos — Cursos',
      percent: 40,
      detail: '03 - Foco.mp4',
    },
    {
      id: 'job-2',
      kind: 'content-extraction',
      status: 'queued',
      label: 'Indexando textos — Cursos',
      percent: null,
      detail: null,
    },
  ],
};

describe('ActivityIndicator', () => {
  it('não aparece quando nada está sendo processado', () => {
    const { container } = render(<ActivityIndicator snapshot={idle} />);
    expect(container.firstChild).toBeNull();
  });

  it('mostra quantas tarefas estão rodando', () => {
    render(<ActivityIndicator snapshot={busy} />);
    expect(screen.getByRole('button', { name: /2 tarefas em andamento/i })).toBeInTheDocument();
  });

  it('ao passar o mouse lista o que está sendo processado, com percentual vindo do núcleo', () => {
    render(<ActivityIndicator snapshot={busy} />);
    expect(screen.queryByRole('list', { name: /atividades/i })).toBeNull();

    fireEvent.mouseEnter(screen.getByTestId('activity-indicator'));

    const list = screen.getByRole('list', { name: /atividades/i });
    expect(list).toHaveTextContent('Analisando biblioteca — Cursos');
    expect(list).toHaveTextContent('Módulo 2/aula.mp4');
    expect(list).toHaveTextContent('Transcrevendo vídeos — Cursos');
    expect(list).toHaveTextContent('40%');
    expect(list).toHaveTextContent('Na fila');
    expect(screen.getAllByRole('progressbar')).toHaveLength(2);
  });

  it('abre a lista também pelo teclado (foco)', () => {
    render(<ActivityIndicator snapshot={busy} />);
    fireEvent.focus(screen.getByRole('button', { name: /tarefas em andamento/i }));
    expect(screen.getByRole('list', { name: /atividades/i })).toBeInTheDocument();
  });
});
