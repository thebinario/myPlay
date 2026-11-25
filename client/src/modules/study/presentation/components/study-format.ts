import type { StudyActivity, StudyTrackKind } from '@/modules/study/domain/study';

/** Formatação de apresentação do cronograma (sem regra de negócio). */

export const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;
export const WEEKDAY_LONG = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
] as const;
/** Ordem de exibição da semana (segunda a domingo). */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export const ACTIVITY_LABEL: Record<StudyActivity, string> = {
  lesson: 'Aula',
  lab: 'Lab',
  reading: 'Leitura',
  practice: 'Exercícios',
  review: 'Revisão',
  other: 'Estudo',
};

export const TRACK_KIND_LABEL: Record<StudyTrackKind, string> = {
  course: 'Curso da biblioteca',
  external: 'Plataforma externa',
  other: 'Outro',
};

export function formatMinutes(total: number): string {
  const minutes = Math.max(0, Math.round(total));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}min`;
}

const pad = (value: number) => String(value).padStart(2, '0');

export function formatClock(minuteOfDay: number): string {
  return `${pad(Math.floor(minuteOfDay / 60))}:${pad(minuteOfDay % 60)}`;
}

/** Converte o valor de um `<input type="time">` em minutos do dia. */
export function parseClock(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function formatElapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(seconds / 3600);
  const clock = `${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
  return hours > 0 ? `${hours}:${clock}` : clock;
}

function parseLocalDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateLong(date: string): string {
  return parseLocalDate(date).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function formatDayOfMonth(date: string): string {
  return String(parseLocalDate(date).getDate());
}

/** Data local de hoje (AAAA-MM-DD) para preencher formulários. */
export function todayInput(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
