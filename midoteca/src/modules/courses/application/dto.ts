import type { CourseRepository } from '../domain/ports';

/** Shared dependency set for the course-organization use cases. */
export interface CourseOrganizationDependencies {
  courses: CourseRepository;
}
