/**
 * `WatchSegmentTracker` só encaminha os trechos realmente reproduzidos ao
 * backend. Ele não calcula cobertura nem decide conclusão.
 */
import { describe, expect, it } from 'vitest';
import {
  WatchSegmentTracker,
  type WatchSegment,
} from '@/modules/player/application/watch-segment-tracker';

function tracker() {
  const segments: WatchSegment[] = [];
  const instance = new WatchSegmentTracker((segment) => segments.push(segment));
  return { instance, segments };
}

describe('WatchSegmentTracker', () => {
  it('envia um trecho contínuo a cada 10s de mídia reproduzida', () => {
    const { instance, segments } = tracker();
    for (let t = 0; t <= 25; t += 0.25) instance.tick(t, true, 1);
    expect(segments).toEqual([
      { fromSeconds: 0, toSeconds: 10 },
      { fromSeconds: 10, toSeconds: 20 },
    ]);
    instance.flush();
    expect(segments.at(-1)).toEqual({ fromSeconds: 20, toSeconds: 25 });
  });

  it('não conta o salto da busca (seek) como assistido', () => {
    const { instance, segments } = tracker();
    for (let t = 0; t <= 5; t += 0.25) instance.tick(t, true, 1);
    instance.tick(590, true, 1); // pulou para perto do fim
    instance.tick(592, true, 1);
    instance.flush();
    expect(segments).toEqual([
      { fromSeconds: 0, toSeconds: 5 },
      { fromSeconds: 590, toSeconds: 592 },
    ]);
  });

  it('aceita saltos maiores entre ticks quando a velocidade é alta', () => {
    const { instance, segments } = tracker();
    for (let t = 0; t <= 12; t += 4) instance.tick(t, true, 16);
    expect(segments).toEqual([{ fromSeconds: 0, toSeconds: 12 }]);
  });

  it('fecha o trecho ao pausar e não registra tempo pausado', () => {
    const { instance, segments } = tracker();
    instance.tick(0, true, 1);
    instance.tick(3, true, 1);
    instance.tick(3, false, 1);
    instance.tick(3, false, 1);
    instance.tick(3, true, 1);
    instance.tick(4, true, 1);
    instance.flush();
    expect(segments).toEqual([
      { fromSeconds: 0, toSeconds: 3 },
      { fromSeconds: 3, toSeconds: 4 },
    ]);
  });

  it('voltar no tempo inicia um novo trecho', () => {
    const { instance, segments } = tracker();
    instance.tick(30, true, 1);
    instance.tick(32, true, 1);
    instance.tick(10, true, 1);
    instance.tick(11, true, 1);
    instance.flush();
    expect(segments).toEqual([
      { fromSeconds: 30, toSeconds: 32 },
      { fromSeconds: 10, toSeconds: 11 },
    ]);
  });

  it('inclui a duração informada pelo elemento de mídia', () => {
    const segments: WatchSegment[] = [];
    const instance = new WatchSegmentTracker((segment) => segments.push(segment));
    instance.tick(0, true, 1, 596.48);
    instance.tick(2, true, 1, 596.48);
    instance.flush();
    expect(segments).toEqual([{ fromSeconds: 0, toSeconds: 2, durationSeconds: 596.48 }]);
  });

  it('ignora trechos vazios', () => {
    const { instance, segments } = tracker();
    instance.tick(5, true, 1);
    instance.flush();
    instance.flush();
    expect(segments).toEqual([]);
  });
});
