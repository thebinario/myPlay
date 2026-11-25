import type { EventBus } from '../modules/indexing';
import type { JobRunner, JobRepository } from '../modules/jobs';
import { scheduleJobOnce } from '../modules/jobs/application/schedule-source-job';
import {
  LlmOrganizationSuggester,
  OrganizationSuggestionService,
  SqliteCourseRestructurer,
  SqliteOrganizationSuggestionRepository,
  type CourseRepository,
} from '../modules/courses';
import type { StructuredLlm } from '../core/structured-llm';
import type { SqliteDatabase } from '../platform/persistence/sqlite/database';

/** One job per course; heavy (local model), so it waits for playback to stop. */
export const COURSES_SUGGEST_ORGANIZATION_JOB = 'courses.suggest-organization';

export interface OrganizationSuggestionWiring {
  database: SqliteDatabase;
  courses: CourseRepository;
  jobs: JobRepository;
  runner: JobRunner;
  events: EventBus;
  llm: StructuredLlm | undefined;
  isEnabled(): Promise<boolean>;
  now(): string;
}

/** Composes "Reorganizar com IA": service, persistence and its background job. */
export function createOrganizationSuggestions(
  wiring: OrganizationSuggestionWiring,
): OrganizationSuggestionService {
  const { llm, jobs, runner } = wiring;
  const service = new OrganizationSuggestionService({
    courses: wiring.courses,
    suggestions: new SqliteOrganizationSuggestionRepository(wiring.database),
    restructurer: new SqliteCourseRestructurer(wiring.database),
    ai: llm
      ? {
          suggester: new LlmOrganizationSuggester(llm),
          scheduler: {
            schedule: async (courseId) => {
              const enqueue = scheduleJobOnce(
                jobs,
                COURSES_SUGGEST_ORGANIZATION_JOB,
                { courseId },
                2,
              );
              runner.track(enqueue);
              await enqueue;
            },
          },
        }
      : null,
    isEnabled: wiring.isEnabled,
    now: wiring.now,
    onApplied: (courseId) =>
      wiring.events.emit('course:organized', {
        courseId,
        sourceId: '',
        relativePath: '',
        created: false,
      }),
  });

  if (llm) {
    runner.register(COURSES_SUGGEST_ORGANIZATION_JOB, async (context) => {
      const courseId = context.job.payload?.courseId;
      if (typeof courseId !== 'string') throw new Error('Sugestão de organização sem courseId');
      await context.waitForIdle();
      await service.generate(courseId, context.signal);
    });
  }
  return service;
}
