import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMidoteca, type Midoteca } from '../../../../src/index';
import { ConflictError, ValidationError } from '../../../../src/core/errors';
import { createTempDatabase, type TempDatabase } from '../../../helpers/temp-db';

const MIN = 60_000;
/** Quarta-feira, 25/11/2026 (horário local). */
const WEDNESDAY = 3;

describe('study planner (SQLite)', () => {
  let temp: TempDatabase;
  let app: Midoteca;
  let now: Date;
  const at = (hour: number, minute = 0, day = 25) => new Date(2026, 10, day, hour, minute);

  beforeEach(() => {
    temp = createTempDatabase();
    now = at(9);
    app = createMidoteca({ databaseFile: temp.file, clock: () => now });
  });

  afterEach(() => {
    if (app.database.isOpen) app.close();
    temp.cleanup();
  });

  async function seedCourse(title = 'Pentest Web') {
    const course = await app.courses.create({ title });
    const m1 = await app.courses.createModule({ courseId: course.id, title: 'Módulo 1' });
    const l1 = await app.courses.createLesson({ moduleId: m1.id, title: 'Aula 1' });
    const l2 = await app.courses.createLesson({ moduleId: m1.id, title: 'Aula 2' });
    return { course, l1, l2 };
  }

  describe('trilhas', () => {
    it('cria trilhas externas (Hack The Box) com cor padrão e lista só as ativas', async () => {
      const htb = await app.study.saveTrack({
        title: 'Hack The Box — Labs',
        kind: 'external',
        platform: 'Hack The Box',
        url: 'https://app.hackthebox.com',
      });
      expect(htb).toMatchObject({ kind: 'external', courseId: null, archivedAt: null });
      expect(htb.color).toMatch(/^#[0-9A-F]{6}$/i);

      const club = await app.study.saveTrack({
        title: 'HackingClub',
        kind: 'external',
        platform: 'HackingClub',
      });
      await app.study.archiveTrack(club.id);
      expect((await app.study.listTracks()).map((track) => track.title)).toEqual([
        'Hack The Box — Labs',
      ]);
      expect(await app.study.listTracks({ includeArchived: true })).toHaveLength(2);
    });

    it('renomeia uma trilha existente', async () => {
      const track = await app.study.saveTrack({ title: 'HTB', kind: 'external', platform: 'HTB' });
      const renamed = await app.study.saveTrack({ ...track, title: 'Hack The Box' });
      expect(renamed.id).toBe(track.id);
      expect(renamed.title).toBe('Hack The Box');
    });

    it('valida título, plataforma, URL e curso da biblioteca', async () => {
      await expect(app.study.saveTrack({ title: ' ', kind: 'other' })).rejects.toThrow(
        ValidationError,
      );
      await expect(app.study.saveTrack({ title: 'X', kind: 'external' })).rejects.toThrow(
        /plataforma/i,
      );
      await expect(
        app.study.saveTrack({ title: 'X', kind: 'external', platform: 'P', url: 'javascript:1' }),
      ).rejects.toThrow(/url/i);
      await expect(
        app.study.saveTrack({ title: 'X', kind: 'course', courseId: 'missing' }),
      ).rejects.toThrow(/curso/i);
    });

    it('uma trilha por curso da biblioteca', async () => {
      const { course } = await seedCourse();
      await app.study.saveTrack({ title: 'Pentest', kind: 'course', courseId: course.id });
      await expect(
        app.study.saveTrack({ title: 'De novo', kind: 'course', courseId: course.id }),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('cronograma', () => {
    it('salva a semana inteira e devolve os blocos ordenados', async () => {
      const htb = await app.study.saveTrack({ title: 'HTB', kind: 'external', platform: 'HTB' });
      const saved = await app.study.saveSchedule({
        blocks: [
          { trackId: htb.id, weekday: 5, startMinute: 1200, durationMinutes: 60 },
          { trackId: htb.id, weekday: 1, startMinute: 420, durationMinutes: 45, activity: 'lab' },
        ],
      });
      expect(saved.map((block) => block.weekday)).toEqual([1, 5]);
      expect(await app.study.getSchedule()).toEqual(saved);

      await app.study.saveSchedule({ blocks: [] });
      expect(await app.study.getSchedule()).toEqual([]);
    });

    it('arquivar a trilha tira os blocos dela do cronograma', async () => {
      const htb = await app.study.saveTrack({ title: 'HTB', kind: 'external', platform: 'HTB' });
      await app.study.saveSchedule({
        blocks: [{ trackId: htb.id, weekday: 1, startMinute: 420, durationMinutes: 45 }],
      });
      await app.study.archiveTrack(htb.id);
      expect(await app.study.getSchedule()).toEqual([]);
    });
  });

  describe('o que estudar agora', () => {
    it('monta o dia com o foco atual, a próxima aula do curso e o tempo registrado', async () => {
      const { course, l1, l2 } = await seedCourse();
      const courseTrack = await app.study.saveTrack({
        title: 'Pentest Web',
        kind: 'course',
        courseId: course.id,
      });
      const htb = await app.study.saveTrack({ title: 'HTB', kind: 'external', platform: 'HTB' });
      await app.study.saveSchedule({
        blocks: [
          { trackId: htb.id, weekday: WEDNESDAY, startMinute: 7 * 60, durationMinutes: 60 },
          { trackId: courseTrack.id, weekday: WEDNESDAY, startMinute: 8 * 60, durationMinutes: 90 },
          { trackId: htb.id, weekday: 4, startMinute: 7 * 60, durationMinutes: 60 },
        ],
      });
      await app.watchProgress.setCompletion({ lessonId: l1.id, completed: true });

      now = at(8, 30);
      const day = await app.study.getDay();
      expect(day).toMatchObject({
        date: '2026-11-25',
        weekday: WEDNESDAY,
        isToday: true,
        nowMinute: 8 * 60 + 30,
        plannedMinutes: 150,
      });
      expect(day.blocks.map((block) => block.status)).toEqual(['missed', 'now']);
      expect(day.focus).toMatchObject({ kind: 'now', blockId: day.blocks[1].block.id });
      expect(day.blocks[1].nextLesson).toEqual({
        lessonId: l2.id,
        title: 'Aula 2',
        moduleTitle: 'Módulo 1',
      });
      expect(day.blocks[0].nextLesson).toBeNull();
    });

    it('o cronômetro em andamento já conta no progresso do bloco', async () => {
      const htb = await app.study.saveTrack({ title: 'HTB', kind: 'external', platform: 'HTB' });
      await app.study.saveSchedule({
        blocks: [{ trackId: htb.id, weekday: WEDNESDAY, startMinute: 9 * 60, durationMinutes: 60 }],
      });
      await app.study.startTimer({ trackId: htb.id, activity: 'lab' });
      now = at(9, 30);
      const day = await app.study.getDay();
      expect(day.timer).toMatchObject({ trackId: htb.id, activity: 'lab', elapsedMs: 30 * MIN });
      expect(day.blocks[0]).toMatchObject({ status: 'now', loggedMinutes: 30 });
    });
  });

  describe('registro de tempo', () => {
    it('cronômetro: parar gera uma sessão; trocar de trilha fecha a anterior', async () => {
      const htb = await app.study.saveTrack({ title: 'HTB', kind: 'external', platform: 'HTB' });
      const club = await app.study.saveTrack({
        title: 'HackingClub',
        kind: 'external',
        platform: 'HackingClub',
      });
      await app.study.startTimer({ trackId: htb.id, activity: 'lab' });
      now = at(10);
      await app.study.startTimer({ trackId: club.id, activity: 'lesson' });
      now = at(10, 45);
      const stopped = await app.study.stopTimer({ note: 'Módulo de SQLi' });

      expect(stopped).toMatchObject({
        trackId: club.id,
        durationMs: 45 * MIN,
        source: 'timer',
        activity: 'lesson',
        note: 'Módulo de SQLi',
        day: '2026-11-25',
      });
      const day = await app.study.getDay();
      expect(day.timer).toBeNull();
      expect(day.loggedMinutes).toBe(105);
      expect(day.sessions.map((session) => [session.track.title, session.durationMs])).toEqual([
        ['HTB', 60 * MIN],
        ['HackingClub', 45 * MIN],
      ]);
    });

    it('descarta sessões de menos de um minuto e limita esquecimentos a 12 h', async () => {
      const htb = await app.study.saveTrack({ title: 'HTB', kind: 'external', platform: 'HTB' });
      await app.study.startTimer({ trackId: htb.id });
      now = at(9, 0);
      expect(await app.study.stopTimer({})).toBeNull();

      await app.study.startTimer({ trackId: htb.id });
      now = at(9, 0, 26);
      expect((await app.study.stopTimer({}))?.durationMs).toBe(12 * 60 * MIN);
    });

    it('o cronômetro sobrevive ao fechamento do aplicativo', async () => {
      const htb = await app.study.saveTrack({ title: 'HTB', kind: 'external', platform: 'HTB' });
      await app.study.startTimer({ trackId: htb.id });
      app.close();
      app = createMidoteca({ databaseFile: temp.file, clock: () => now });
      now = at(9, 20);
      expect((await app.study.getDay()).timer?.elapsedMs).toBe(20 * MIN);
    });

    it('registro manual em dias passados, com validação de data e limite diário', async () => {
      const htb = await app.study.saveTrack({ title: 'HTB', kind: 'external', platform: 'HTB' });
      const logged = await app.study.logSession({
        trackId: htb.id,
        date: '2026-11-24',
        minutes: 90,
        activity: 'lab',
        note: 'Máquina Easy',
      });
      expect(logged).toMatchObject({ source: 'manual', durationMs: 90 * MIN, day: '2026-11-24' });
      expect((await app.study.getDay({ date: '2026-11-24' })).loggedMinutes).toBe(90);

      await expect(
        app.study.logSession({ trackId: htb.id, date: '2026-11-26', minutes: 10 }),
      ).rejects.toThrow(/futuro/i);
      await expect(
        app.study.logSession({ trackId: htb.id, date: '2026-11-24', minutes: 0 }),
      ).rejects.toThrow(ValidationError);
      await app.study.logSession({ trackId: htb.id, date: '2026-11-24', minutes: 700 });
      await app.study.logSession({ trackId: htb.id, date: '2026-11-24', minutes: 600 });
      await expect(
        app.study.logSession({ trackId: htb.id, date: '2026-11-24', minutes: 60 }),
      ).rejects.toThrow(/24 h/i);
    });

    it('exclui um registro feito por engano', async () => {
      const htb = await app.study.saveTrack({ title: 'HTB', kind: 'external', platform: 'HTB' });
      const logged = await app.study.logSession({
        trackId: htb.id,
        date: '2026-11-25',
        minutes: 30,
      });
      await app.study.deleteSession(logged.id);
      expect((await app.study.getDay()).sessions).toEqual([]);
    });

    it('não registra em trilha arquivada', async () => {
      const htb = await app.study.saveTrack({ title: 'HTB', kind: 'external', platform: 'HTB' });
      await app.study.archiveTrack(htb.id);
      await expect(app.study.startTimer({ trackId: htb.id })).rejects.toThrow(/arquivada/i);
    });
  });

  describe('tempo assistido no player', () => {
    it('soma no dia do curso, criando a trilha do curso se preciso', async () => {
      const { course, l1 } = await seedCourse();
      for (let start = 0; start < 3 * MIN; start += 10_000) {
        await app.watchProgress.recordSegment({
          lessonId: l1.id,
          fromMs: start,
          toMs: start + 10_000,
        });
      }
      const tracks = await app.study.listTracks();
      expect(tracks).toEqual([
        expect.objectContaining({ kind: 'course', courseId: course.id, title: 'Pentest Web' }),
      ]);
      const day = await app.study.getDay();
      expect(day.sessions).toEqual([
        expect.objectContaining({ source: 'player', durationMs: 3 * MIN, activity: 'lesson' }),
      ]);
    });

    it('com o cronômetro ligado, o player não soma o mesmo tempo duas vezes', async () => {
      const { course, l1 } = await seedCourse();
      const track = await app.study.saveTrack({ title: 'P', kind: 'course', courseId: course.id });
      await app.study.startTimer({ trackId: track.id });
      await app.watchProgress.recordSegment({ lessonId: l1.id, fromMs: 0, toMs: 10_000 });
      expect((await app.study.getDay()).sessions).toEqual([]);
    });
  });

  describe('semana', () => {
    it('resume planejado x feito por dia e conta a sequência de dias cumpridos', async () => {
      const htb = await app.study.saveTrack({ title: 'HTB', kind: 'external', platform: 'HTB' });
      // Seg, ter e qua: 30 min cada.
      await app.study.saveSchedule({
        blocks: [1, 2, 3].map((weekday) => ({
          trackId: htb.id,
          weekday,
          startMinute: 7 * 60,
          durationMinutes: 30,
        })),
      });
      await app.study.logSession({ trackId: htb.id, date: '2026-11-23', minutes: 30 });
      await app.study.logSession({ trackId: htb.id, date: '2026-11-24', minutes: 40 });
      await app.study.logSession({ trackId: htb.id, date: '2026-11-22', minutes: 15 });

      const week = await app.study.getWeek();
      expect(week.from).toBe('2026-11-23');
      expect(week.to).toBe('2026-11-29');
      expect(
        week.days.map((day) => [day.date, day.plannedMinutes, day.loggedMinutes, day.metPlan]),
      ).toEqual([
        ['2026-11-23', 30, 30, true],
        ['2026-11-24', 30, 40, true],
        ['2026-11-25', 30, 0, false],
        ['2026-11-26', 0, 0, null],
        ['2026-11-27', 0, 0, null],
        ['2026-11-28', 0, 0, null],
        ['2026-11-29', 0, 0, null],
      ]);
      // Hoje ainda não foi cumprido, mas não quebra a sequência.
      expect(week.streakDays).toBe(2);
      expect(week.totalLoggedMinutes).toBe(70);
      expect(week.tracks).toEqual([expect.objectContaining({ loggedMinutes: 70 })]);
    });
  });
});
