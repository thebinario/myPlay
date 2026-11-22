/** Trecho de mídia realmente reproduzido, em segundos de mídia. */
export interface WatchSegment {
  fromSeconds: number;
  toSeconds: number;
  /** Duração informada pelo elemento de mídia; o backend prefere a catalogada. */
  durationSeconds?: number;
}

/** Envia um trecho a cada ~10s de mídia; o backend aceita até 120s. */
export const SEGMENT_FLUSH_SECONDS = 10;

/**
 * Coordena a interação com o `<video>`: transforma os ticks de tempo em
 * trechos contínuos realmente reproduzidos e os encaminha. Saltos (seek),
 * pausa e retrocesso encerram o trecho atual. Não calcula cobertura nem decide
 * conclusão: isso é responsabilidade do backend (`progress.recordSegment`).
 */
export class WatchSegmentTracker {
  private startSeconds: number | null = null;
  private lastSeconds = 0;
  private durationSeconds: number | undefined;

  constructor(private readonly onSegment: (segment: WatchSegment) => void) {}

  tick(
    currentSeconds: number,
    isPlaying: boolean,
    playbackRate: number,
    durationSeconds?: number,
  ): void {
    if (durationSeconds && Number.isFinite(durationSeconds) && durationSeconds > 0) {
      this.durationSeconds = durationSeconds;
    }
    if (!isPlaying) {
      this.flush();
      return;
    }
    if (this.startSeconds === null) {
      this.begin(currentSeconds);
      return;
    }

    const delta = currentSeconds - this.lastSeconds;
    // timeupdate dispara a cada ~250ms; com velocidade alta o passo cresce.
    const maxStep = 2 + 2 * Math.max(1, playbackRate);
    if (delta < 0 || delta > maxStep) {
      this.flush();
      this.begin(currentSeconds);
      return;
    }

    this.lastSeconds = currentSeconds;
    if (this.lastSeconds - this.startSeconds >= SEGMENT_FLUSH_SECONDS) {
      const end = this.lastSeconds;
      this.flush();
      this.begin(end);
    }
  }

  /** Encerra e envia o trecho em andamento (pausa, troca de aula, unmount). */
  flush(): void {
    if (this.startSeconds !== null && this.lastSeconds > this.startSeconds) {
      this.onSegment({
        fromSeconds: this.startSeconds,
        toSeconds: this.lastSeconds,
        ...(this.durationSeconds ? { durationSeconds: this.durationSeconds } : {}),
      });
    }
    this.startSeconds = null;
  }

  private begin(seconds: number): void {
    this.startSeconds = seconds;
    this.lastSeconds = seconds;
  }
}
