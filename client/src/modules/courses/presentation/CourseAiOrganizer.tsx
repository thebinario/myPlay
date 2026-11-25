import React, { useMemo } from 'react';
import { OrganizationSuggestionPanel } from '@/modules/courses/presentation/OrganizationSuggestionPanel';
import { useOrganizationSuggestion } from '@/modules/courses/presentation/hooks/useOrganizationSuggestion';

export interface CourseAiOrganizerProps {
  courseId: string;
  lessons: ReadonlyArray<{ id: string; title: string }>;
  /** Intervalo de releitura enquanto a IA trabalha (testes usam um curto). */
  pollMs?: number;
}

/** Liga o painel "Reorganizar com IA" ao núcleo para um curso. */
export const CourseAiOrganizer: React.FC<CourseAiOrganizerProps> = ({
  courseId,
  lessons,
  pollMs,
}) => {
  const viewModel = useOrganizationSuggestion(courseId, pollMs);
  const lessonTitles = useMemo(
    () => new Map(lessons.map((lesson) => [lesson.id, lesson.title])),
    [lessons],
  );
  return (
    <OrganizationSuggestionPanel
      state={viewModel.state}
      busy={viewModel.busy}
      error={viewModel.error}
      lessonTitles={lessonTitles}
      onRequest={viewModel.request}
      onApply={viewModel.apply}
      onDismiss={viewModel.dismiss}
    />
  );
};

CourseAiOrganizer.displayName = 'CourseAiOrganizer';
