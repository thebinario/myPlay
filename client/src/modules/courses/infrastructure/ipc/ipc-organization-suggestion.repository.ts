import type { MidotecaBridge } from '@/core/contracts/desktop-bridge';
import type {
  OrganizationSuggestionRepository,
  OrganizationSuggestionStateView,
} from '@/modules/courses/domain/organization-suggestion';

/** Adapter IPC de "Reorganizar com IA" (`courses.suggestion.*`). */
export class IpcOrganizationSuggestionRepository implements OrganizationSuggestionRepository {
  constructor(private readonly bridge: MidotecaBridge) {}

  async get(courseId: string): Promise<OrganizationSuggestionStateView> {
    const state = await this.bridge.invoke('courses.suggestion.get', { courseId });
    return {
      available: state.available,
      suggestion: state.suggestion
        ? {
            courseId: state.suggestion.courseId,
            status: state.suggestion.status,
            modules: state.suggestion.modules,
            modelId: state.suggestion.modelId,
            error: state.suggestion.error,
          }
        : null,
    };
  }

  async request(courseId: string): Promise<void> {
    await this.bridge.invoke('courses.suggestion.request', { courseId });
  }

  async apply(courseId: string): Promise<void> {
    await this.bridge.invoke('courses.suggestion.apply', { courseId });
  }

  async dismiss(courseId: string): Promise<void> {
    await this.bridge.invoke('courses.suggestion.dismiss', { courseId });
  }
}
