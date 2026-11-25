import type { Midoteca } from '../../app/composition-root';
import { ValidationError } from '../../core/errors';
import type { DesktopMethod, DesktopParams } from './contract';

type StudyMethod = Extract<DesktopMethod, `study.${string}`>;

/** Thin translation of the `study.*` RPC methods to the study planner use cases. */
export async function dispatchStudy(
  midoteca: Midoteca,
  method: DesktopMethod,
  params: unknown,
): Promise<unknown> {
  const { study } = midoteca;
  switch (method as StudyMethod) {
    case 'study.tracks.list':
      return study.listTracks((params as DesktopParams['study.tracks.list']) ?? {});
    case 'study.courses':
      return study.listCourses((params as DesktopParams['study.courses']) ?? {});
    case 'study.tracks.save':
      return study.saveTrack(params as DesktopParams['study.tracks.save']);
    case 'study.tracks.archive':
      await study.archiveTrack((params as DesktopParams['study.tracks.archive'])?.trackId);
      return null;
    case 'study.schedule.get':
      return study.getSchedule();
    case 'study.schedule.save':
      return study.saveSchedule(params as DesktopParams['study.schedule.save']);
    case 'study.timer.start':
      return study.startTimer(params as DesktopParams['study.timer.start']);
    case 'study.timer.stop':
      return study.stopTimer((params as DesktopParams['study.timer.stop']) ?? {});
    case 'study.sessions.log':
      return study.logSession(params as DesktopParams['study.sessions.log']);
    case 'study.sessions.delete':
      await study.deleteSession((params as DesktopParams['study.sessions.delete'])?.sessionId);
      return null;
    case 'study.day':
      return study.getDay((params as DesktopParams['study.day']) ?? {});
    case 'study.week':
      return study.getWeek((params as DesktopParams['study.week']) ?? {});
    default:
      throw new ValidationError(`Unknown desktop method: ${String(method)}`);
  }
}
