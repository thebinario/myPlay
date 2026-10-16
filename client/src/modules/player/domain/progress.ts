/**
 * Regras puras de tempo de reprodução (formatação e busca), sem dependência de
 * React ou do elemento de mídia.
 */

/** Formata segundos como `MM:SS` com minutos preenchidos em 2 dígitos. */
export function formatSeconds(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const minutes = Math.floor(safe / 60);
  const remainder = Math.floor(safe % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
}

/** Limita um instante ao intervalo [0, duration] (quando a duração é conhecida). */
export function clampSeekTime(time: number, duration: number): number {
  if (duration > 0) return Math.min(Math.max(0, time), duration);
  return Math.max(0, time);
}

/** Converte a fração clicada na barra de progresso em tempo de destino. */
export function seekTimeFromRatio(ratio: number, duration: number): number {
  return ratio * duration;
}

/** Fração 0..1 da posição do ponteiro dentro de uma barra de progresso. */
export function ratioFromOffset(offsetX: number, width: number): number | null {
  if (width <= 0) return null;
  return offsetX / width;
}
