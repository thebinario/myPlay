import type {
  OrganizationSuggestion,
  SuggestedBoundary,
  SuggestedModule,
} from './organization-suggestion';

/** Proposes module boundaries for lessons given in reading order (the AI). */
export interface OrganizationSuggester {
  readonly modelId: string;
  suggest(lessonTitles: readonly string[], signal?: AbortSignal): Promise<SuggestedBoundary[]>;
}

export interface OrganizationSuggestionRepository {
  get(courseId: string): Promise<OrganizationSuggestion | null>;
  save(suggestion: OrganizationSuggestion): Promise<void>;
  delete(courseId: string): Promise<void>;
}

/**
 * Replaces the course modules by `modules` in one transaction: lessons keep
 * their ids (and progress), materials of removed modules are re-linked, files
 * are never touched. Throws `ValidationError` when `modules` does not cover
 * the course lessons exactly.
 */
export interface CourseRestructurer {
  replaceModules(courseId: string, modules: readonly SuggestedModule[]): Promise<void>;
}

/** Queues the background generation of a suggestion (job queue). */
export interface SuggestionScheduler {
  schedule(courseId: string): Promise<void>;
}
