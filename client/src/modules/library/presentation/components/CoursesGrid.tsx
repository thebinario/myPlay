import React from 'react';
import type { Course } from '@/core/domain/library';
import { CourseCard } from '@/modules/library/presentation/components/CourseCard';

interface CoursesGridProps {
  courses: Course[];
  onSelectCourse: (courseId: string) => void;
  emptyMessage?: string;
}

/** Grade de cursos de uma coleção. Não renderiza nada quando não há cursos. */
export const CoursesGrid: React.FC<CoursesGridProps> = ({
  courses,
  onSelectCourse,
  emptyMessage = 'Nenhum curso nesta coleção.',
}) => {
  if (courses.length === 0) {
    return <p style={styles.empty}>{emptyMessage}</p>;
  }

  return (
    <div style={styles.grid}>
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} onSelect={onSelectCourse} />
      ))}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 16,
  },
  empty: {
    color: '#94A3B8',
  },
};
