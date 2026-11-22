import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ActivityIndicator } from '@/modules/activity/presentation/ActivityIndicator';
import type { ActivitySnapshotView } from '@/modules/activity/domain/activity';

const NOW = Date.parse('2026-11-22T12:00:00Z');
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const MIN = 60_000;

const base = { detail: null, finishedAt: null, percent: null };
const idle: ActivitySnapshotView = { items: [], running: 0, queued: 0, recent: [] };
const busy: ActivitySnapshotView = {
  running: 1,
  queued: 1,
  items: [
    {
      ...base,
      id: 'scan:1',
      kind: 'scan',
      status: 'running',
      label: 'Atualizando biblioteca',
      percent: 62,
    },
    {
      ...base,
      id: 'job-2',
      kind: 'content-extraction',
      status: 'queued',
      label: 'Indexação de documentos · Cursos',
    },
  ],
  recent: [
    {
      ...base,
      id: 'job-1@1',
      kind: 'transcription',
      status: 'completed',
      label: 'Transcrição · Cursos',
      finishedAt: ago(2 * MIN),
    },
    {
      ...base,
      id: 'scan:2@1',
      kind: 'scan',
      status: 'failed',
      label: 'Atualizando biblioteca · HD externo',
      finishedAt: ago(60 * MIN),
    },
  ],
};

const open = (snapshot: ActivitySnapshotView) => {
  render(<ActivityIndicator snapshot={snapshot} now={NOW} />);
  fireEvent.click(screen.getByRole('button', { name: /atividade/i }));
  return screen.getByRole('dialog', { name: 'Atividade' });
};

describe('ActivityIndicator — menu suspenso de atividade', () => {
  it('fica sempre disponível e resume o que está rodando no nome acessível', () => {
    render(<ActivityIndicator snapshot={busy} now={NOW} />);
    expect(
      screen.getByRole('button', { name: 'Atividade: 1 tarefa em andamento, 1 na fila' }),
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('sem nada rodando, o botão continua lá e o painel avisa que não há processos', () => {
    const dialog = open(idle);
    expect(dialog).toHaveTextContent('Nenhum processo recente');
  });

  it('lista em andamento, fila e os últimos encerrados, com o status e o tempo relativo', () => {
    const dialog = open(busy);
    expect(dialog).toHaveTextContent('Últimos 4 processos');
    const rows = within(dialog).getAllByRole('listitem');
    expect(rows.map((row) => row.textContent)).toEqual([
      'Atualizando bibliotecaEm andamento · 62%',
      'Indexação de documentos · CursosNa fila',
      'Transcrição · CursosConcluído · há 2 min',
      'Atualizando biblioteca · HD externoFalhou · há 1 h',
    ]);
    expect(within(rows[0]).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '62');
  });

  it('mostra o motivo de cada falha, para diagnóstico', () => {
    const dialog = open({
      ...busy,
      recent: [
        {
          ...base,
          id: 'job-9:media-9@1',
          kind: 'transcription',
          status: 'failed',
          label: 'Transcrição · Boas-vindas',
          detail: 'Áudio ilegível: stream truncado',
          finishedAt: ago(5 * MIN),
        },
      ],
    });
    const row = within(dialog).getByText('Transcrição · Boas-vindas').closest('li')!;
    const reason = within(row).getByText('Áudio ilegível: stream truncado');
    expect(reason).toHaveAttribute('title', 'Áudio ilegível: stream truncado');
    expect(row).toHaveTextContent('Falhou · há 5 min');
  });

  it('não mostra o arquivo atual como motivo em processos concluídos', () => {
    const dialog = open({
      ...idle,
      recent: [
        {
          ...base,
          id: 'ok@1',
          kind: 'transcription',
          status: 'completed',
          label: 'Transcrição · Boas-vindas',
          detail: 'resto de progresso',
          finishedAt: ago(MIN),
        },
      ],
    });
    expect(dialog).not.toHaveTextContent('resto de progresso');
  });

  it('abre e fecha pelo clique e fecha com Esc', () => {
    open(busy);
    const toggle = screen.getByRole('button', { name: /atividade/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
