import { NotFoundError, ValidationError } from '../../../../core/errors';
import type { CourseRepository } from '../../domain/ports';
import {
  buildSuggestedModules,
  orderLessonsForSuggestion,
  suggestionCoversCourse,
  type OrganizationSuggestion,
} from '../../domain/organization-suggestion';
import type {
  CourseRestructurer,
  OrganizationSuggester,
  OrganizationSuggestionRepository,
  SuggestionScheduler,
} from '../../domain/suggestion-ports';

export interface OrganizationSuggestionDependencies {
  courses: CourseRepository;
  suggestions: OrganizationSuggestionRepository;
  restructurer: CourseRestructurer;
  /** Absent when no local model exists (AI off or not installed). */
  ai: { suggester: OrganizationSuggester; scheduler: SuggestionScheduler } | null;
  /** AI switch in Settings. */
  isEnabled(): Promise<boolean>;
  now(): string;
  /** Lets the UI refresh the catalog after the organization changed. */
  onApplied?(courseId: string): void;
}

export interface OrganizationSuggestionState {
  /** False when the local model cannot run (AI disabled or unavailable). */
  available: boolean;
  suggestion: OrganizationSuggestion | null;
}

/**
 * "Reorganizar com IA": the model proposes modules in the background (job),
 * the user reviews and applies or dismisses. Applying is a catalog-only change
 * that keeps lesson ids, so progress is preserved and files are never touched.
 */
export class OrganizationSuggestionService {
  constructor(private readonly deps: OrganizationSuggestionDependencies) {}

  async get(courseId: string): Promise<OrganizationSuggestionState> {
    return {
      available: await this.available(),
      suggestion: await this.deps.suggestions.get(courseId),
    };
  }

  async request(courseId: string): Promise<OrganizationSuggestion> {
    const ai = this.deps.ai;
    if (!ai || !(await this.available())) {
      throw new ValidationError('A IA local está desativada ou indisponível.');
    }
    await this.requireCourse(courseId);
    const pending = this.record(courseId, { status: 'pending' });
    await this.deps.suggestions.save(pending);
    await ai.scheduler.schedule(courseId);
    return pending;
  }

  /**
   * Job body. Failures are recorded (not thrown): asking the model again
   * would just repeat the same answer, so the user decides when to retry.
   */
  async generate(courseId: string, signal?: AbortSignal): Promise<void> {
    const ai = this.deps.ai;
    if (!ai) return;
    await this.deps.suggestions.save(this.record(courseId, { status: 'running' }));
    try {
      const tree = await this.requireCourse(courseId);
      const lessons = orderLessonsForSuggestion(tree.modules);
      const boundaries = await ai.suggester.suggest(
        lessons.map((lesson) => lesson.title),
        signal,
      );
      const modules = buildSuggestedModules(
        lessons.map((lesson) => lesson.id),
        boundaries,
      );
      await this.deps.suggestions.save(
        this.record(courseId, { status: 'ready', modules, modelId: ai.suggester.modelId }),
      );
    } catch (error) {
      if (signal?.aborted) throw error;
      await this.deps.suggestions.save(
        this.record(courseId, {
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }

  async apply(courseId: string): Promise<void> {
    const suggestion = await this.deps.suggestions.get(courseId);
    if (!suggestion || suggestion.status !== 'ready') {
      throw new NotFoundError('Não há sugestão pronta para este curso.');
    }
    const tree = await this.requireCourse(courseId);
    const lessonIds = tree.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id));
    if (!suggestionCoversCourse(suggestion.modules, lessonIds)) {
      throw new ValidationError('O curso mudou desde a sugestão. Peça uma nova sugestão.');
    }
    await this.deps.restructurer.replaceModules(courseId, suggestion.modules);
    await this.deps.suggestions.delete(courseId);
    this.deps.onApplied?.(courseId);
  }

  dismiss(courseId: string): Promise<void> {
    return this.deps.suggestions.delete(courseId);
  }

  private async available(): Promise<boolean> {
    return this.deps.ai !== null && (await this.deps.isEnabled());
  }

  private async requireCourse(courseId: string) {
    const tree = await this.deps.courses.getTree(courseId);
    if (!tree) throw new NotFoundError(`Curso ${courseId} não encontrado.`);
    return tree;
  }

  private record(
    courseId: string,
    fields: Partial<OrganizationSuggestion> & Pick<OrganizationSuggestion, 'status'>,
  ): OrganizationSuggestion {
    return {
      courseId,
      modules: [],
      modelId: null,
      error: null,
      updatedAt: this.deps.now(),
      ...fields,
    };
  }
}
