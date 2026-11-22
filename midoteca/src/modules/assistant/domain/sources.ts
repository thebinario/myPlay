import type { ContentHit } from '../../search/domain/ports';
import type { PromptSource } from './answer';

/** A retrieved passage numbered for the prompt and for the citations UI. */
export interface AnswerSource extends ContentHit {
  index: number;
  label: string;
}

function clock(ms: number | null): string {
  const total = Math.max(0, Math.floor((ms ?? 0) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Human label of where a passage comes from (page or video timestamp). */
export function sourceLabel(hit: ContentHit): string {
  if (hit.sourceKind === 'pdf') {
    return `${hit.documentTitle ?? 'Documento'} · página ${hit.page ?? 1}`;
  }
  const where = [hit.courseTitle, hit.lessonTitle].filter(Boolean).join(' · ') || 'Aula';
  return `${where} (${clock(hit.startMs)})`;
}

export function numberSources(hits: ContentHit[]): AnswerSource[] {
  return hits.map((hit, position) => ({ ...hit, index: position + 1, label: sourceLabel(hit) }));
}

export function toPromptSources(sources: AnswerSource[]): PromptSource[] {
  return sources.map(({ index, label, snippet }) => ({ index, label, text: snippet }));
}
