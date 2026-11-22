import { describe, expect, it } from 'vitest';
import {
  activityKindOf,
  describeActivity,
  progressPercent,
  sortActivities,
  type ActivityItem,
} from '../../../../src/modules/jobs/domain/activity';

describe('jobs/domain — activity', () => {
  it('classifica os tipos de job em categorias de atividade', () => {
    expect(activityKindOf('media.analyze-source')).toBe('media-analysis');
    expect(activityKindOf('media.transcribe-source')).toBe('transcription');
    expect(activityKindOf('search.extract-content')).toBe('content-extraction');
    expect(activityKindOf('search.embed-chunks')).toBe('embeddings');
    expect(activityKindOf('qualquer.outro')).toBe('other');
  });

  it('descreve cada atividade em pt-BR com o nome da biblioteca', () => {
    expect(describeActivity('scan', 'Cursos')).toBe('Analisando biblioteca — Cursos');
    expect(describeActivity('transcription', 'Cursos')).toBe('Transcrevendo vídeos — Cursos');
    expect(describeActivity('embeddings', null)).toBe('Preparando busca inteligente');
  });

  it('calcula o percentual só quando o total é conhecido', () => {
    expect(progressPercent({ done: 1, total: 4 })).toBe(25);
    expect(progressPercent({ done: 3, total: 3 })).toBe(100);
    expect(progressPercent({ done: 5, total: null })).toBeNull();
    expect(progressPercent({ done: 0, total: 0 })).toBeNull();
    expect(progressPercent(null)).toBeNull();
  });

  it('lista primeiro o que está rodando, depois a fila', () => {
    const base = { label: '', sourceId: null, progress: null, percent: null, detail: null };
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
});
