import { describe, expect, it } from 'vitest';
import { buildDayPlan, type PlanBlockInput } from '../../../../src/modules/study/domain/day-plan';

const MIN = 60_000;
const b = (id: string, trackId: string, start: number, duration: number): PlanBlockInput => ({
  id,
  trackId,
  startMinute: start,
  durationMinutes: duration,
});

describe('study/domain — buildDayPlan', () => {
  const blocks = [b('morning', 'htb', 7 * 60, 60), b('night', 'course', 19 * 60, 90)];

  it('sem cronograma no dia, o foco é livre', () => {
    const plan = buildDayPlan({ blocks: [], loggedMsByTrack: new Map(), nowMinute: 600 });
    expect(plan.focus).toEqual({
      kind: 'free',
      blockId: null,
      remainingMinutes: 0,
      startsInMinutes: null,
    });
    expect(plan.plannedMinutes).toBe(0);
    expect(plan.progressPercent).toBe(0);
  });

  it('o bloco em andamento é o foco "agora"', () => {
    const plan = buildDayPlan({
      blocks,
      loggedMsByTrack: new Map([['htb', 20 * MIN]]),
      nowMinute: 7 * 60 + 30,
    });
    expect(plan.blocks[0]).toMatchObject({
      status: 'now',
      loggedMinutes: 20,
      remainingMinutes: 40,
      progressPercent: 33,
    });
    expect(plan.focus).toMatchObject({ kind: 'now', blockId: 'morning', remainingMinutes: 40 });
  });

  it('entre blocos, recuperar o que ficou para trás vem antes do próximo', () => {
    const plan = buildDayPlan({ blocks, loggedMsByTrack: new Map(), nowMinute: 12 * 60 });
    expect(plan.blocks.map((block) => block.status)).toEqual(['missed', 'upcoming']);
    expect(plan.focus).toMatchObject({
      kind: 'catch-up',
      blockId: 'morning',
      remainingMinutes: 60,
    });
  });

  it('com o passado em dia, aponta o próximo bloco e quanto falta para começar', () => {
    const plan = buildDayPlan({
      blocks,
      loggedMsByTrack: new Map([['htb', 60 * MIN]]),
      nowMinute: 18 * 60,
    });
    expect(plan.blocks[0].status).toBe('done');
    expect(plan.focus).toMatchObject({ kind: 'next', blockId: 'night', startsInMinutes: 60 });
  });

  it('um bloco concluído antes do horário (adiantado) conta como feito', () => {
    const plan = buildDayPlan({
      blocks,
      loggedMsByTrack: new Map([
        ['htb', 60 * MIN],
        ['course', 90 * MIN],
      ]),
      nowMinute: 9 * 60,
    });
    expect(plan.blocks.map((block) => block.status)).toEqual(['done', 'done']);
    expect(plan.focus.kind).toBe('done');
    expect(plan.progressPercent).toBe(100);
  });

  it('distribui o tempo da trilha entre os blocos dela, em ordem', () => {
    const plan = buildDayPlan({
      blocks: [b('a', 'htb', 480, 60), b('b', 'htb', 1200, 60)],
      loggedMsByTrack: new Map([['htb', 80 * MIN]]),
      nowMinute: 600,
    });
    expect(plan.blocks.map((block) => [block.status, block.loggedMinutes])).toEqual([
      ['done', 60],
      ['upcoming', 20],
    ]);
    expect(plan.plannedMinutes).toBe(120);
    expect(plan.progressPercent).toBe(67);
  });

  it('tempo além do planejado não ultrapassa 100% do progresso do dia', () => {
    const plan = buildDayPlan({
      blocks: [b('a', 'htb', 480, 30)],
      loggedMsByTrack: new Map([
        ['htb', 120 * MIN],
        ['other', 60 * MIN],
      ]),
      nowMinute: 600,
    });
    expect(plan.progressPercent).toBe(100);
    expect(plan.loggedMinutes).toBe(180);
  });

  it('em outro dia (sem "agora"), não há foco e o passado fica perdido', () => {
    const plan = buildDayPlan({ blocks, loggedMsByTrack: new Map(), nowMinute: null });
    expect(plan.focus).toBeNull();
    expect(plan.blocks.map((block) => block.status)).toEqual(['missed', 'missed']);
  });

  it('em um dia futuro, os blocos ficam todos por vir', () => {
    const plan = buildDayPlan({
      blocks,
      loggedMsByTrack: new Map(),
      nowMinute: null,
      future: true,
    });
    expect(plan.blocks.map((block) => block.status)).toEqual(['upcoming', 'upcoming']);
  });
});
