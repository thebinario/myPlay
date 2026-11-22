import { describe, expect, it } from 'vitest';
import {
  activityKindOf,
  describeActivity,
  progressPercent,
  recordFinished,
  shouldRecordFinished,
  sortActivities,
  type ActivityItem,
} from '../../../../src/modules/jobs/domain/activity';

describe('jobs/domain — activity', () => {
  it('classifica os tipos de job em categorias de atividade', () => {
    expect(activityKindOf('media.analyze-source')).toBe('media-analysis');
    expect(activityKindOf('media.check-playability')).toBe('media-check');
    expect(activityKindOf('media.transcribe-source')).toBe('transcription');
    expect(activityKindOf('search.extract-content')).toBe('content-extraction');
    expect(activityKindOf('search.embed-chunks')).toBe('embeddings');
    expect(activityKindOf('qualquer.outro')).toBe('other');
  });

  it('descreve cada atividade em pt-BR com o nome da biblioteca', () => {
    expect(describeActivity('scan', 'Cursos')).toBe('Atualizando biblioteca · Cursos');
    expect(describeActivity('transcription', 'Cursos')).toBe('Transcrição · Cursos');
    expect(describeActivity('media-analysis', 'Cursos')).toBe('Análise de mídia · Cursos');
    expect(describeActivity('content-extraction', 'Cursos')).toBe(
      'Indexação de documentos · Cursos',
    );
    expect(describeActivity('embeddings', null)).toBe('Busca inteligente');
  });

  it('calcula o percentual só quando o total é conhecido', () => {
    expect(progressPercent({ done: 1, total: 4 })).toBe(25);
    expect(progressPercent({ done: 3, total: 3 })).toBe(100);
    expect(progressPercent({ done: 5, total: null })).toBeNull();
    expect(progressPercent({ done: 0, total: 0 })).toBeNull();
    expect(progressPercent(null)).toBeNull();
  });

  it('lista primeiro o que está rodando, depois a fila', () => {
    const base = {
      label: '',
      sourceId: null,
      progress: null,
      percent: null,
      detail: null,
      finishedAt: null,
    };
    const items: ActivityItem[] = [
      {
        ...base,
        id: 'b',
        kind: 'transcription',
        status: 'queued',
        startedAt: '2026-01-01T00:00:01Z',
      },
      { ...base, id: 'a', kind: 'scan', status: 'running', startedAt: '2026-01-01T00:00:02Z' },
      {
        ...base,
        id: 'c',
        kind: 'media-analysis',
        status: 'queued',
        startedAt: '2026-01-01T00:00:00Z',
      },
    ];
    expect(sortActivities(items).map((item) => item.id)).toEqual(['a', 'c', 'b']);
  });

  describe('histórico de processos encerrados', () => {
    const finished = (id: string, finishedAt: string): ActivityItem => ({
      id,
      kind: 'transcription',
      status: 'completed',
      label: 'Transcrição · Cursos',
      sourceId: null,
      progress: null,
      percent: null,
      detail: null,
      startedAt: '2026-01-01T00:00:00Z',
      finishedAt,
    });

    it('guarda o mais recente primeiro e só os N últimos', () => {
      let history: ActivityItem[] = [];
      for (const n of [1, 2, 3, 4, 5, 6]) {
        history = recordFinished(history, finished(`j${n}`, `2026-01-01T00:0${n}:00Z`), 5);
      }
      expect(history.map((item) => item.id)).toEqual(['j6', 'j5', 'j4', 'j3', 'j2']);
    });

    it('não registra trabalho que terminou sem ter nada a processar', () => {
      expect(shouldRecordFinished({ done: 0, total: 0 })).toBe(false);
      expect(shouldRecordFinished({ done: 3, total: 3 })).toBe(true);
      expect(shouldRecordFinished(null)).toBe(true);
    });
  });
});
