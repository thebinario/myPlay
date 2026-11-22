/** Trecho temporizado de legenda, interpretado pelo backend. */
export interface CueView {
  startMs: number;
  endMs: number;
  text: string;
}

/** Faixa de legenda de uma aula (arquivo ao lado do vídeo ou transcrição local). */
export interface SubtitleTrackView {
  id: string;
  language: string | null;
  generated: boolean;
  cues: CueView[];
}

export interface SubtitlesRepository {
  forLesson(lessonId: string): Promise<SubtitleTrackView[]>;
}

const LANGUAGE_NAMES: Record<string, string> = {
  pt: 'Português',
  en: 'Inglês',
  es: 'Espanhol',
  fr: 'Francês',
  de: 'Alemão',
  it: 'Italiano',
};

/** Rótulo de apresentação da faixa no menu CC. */
export function subtitleLabel(language: string | null, generated: boolean): string {
  const name = language ? (LANGUAGE_NAMES[language] ?? language.toUpperCase()) : 'Legenda';
  return generated ? `${name} (gerada automaticamente)` : name;
}

/** Texto do trecho que cobre o instante atual (apresentação), ou null. */
export function activeCueText(cues: CueView[], currentSeconds: number): string | null {
  const ms = currentSeconds * 1000;
  return cues.find((cue) => ms >= cue.startMs && ms <= cue.endMs)?.text ?? null;
}
