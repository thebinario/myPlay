import React from 'react';
import { Clock, Edit, GraduationCap, Play } from 'lucide-react';
import type { Course } from '@/core/domain/library';
import { courseProgressStyles as styles } from './course-progress-card.styles';

interface CourseProgressCardProps {
  course: Course;
  contentCount?: string;
  spacingAfter?: number;
  onOpenCourse?: (courseId: string) => void;
  onPlayLesson?: (courseId: string, lessonId: string) => void;
  onEditCourse?: (courseId: string) => void;
}

export const CourseProgressCard: React.FC<CourseProgressCardProps> = ({
  course,
  contentCount,
  spacingAfter = 0,
  onOpenCourse,
  onPlayLesson,
  onEditCourse,
}) => {
  const lessons = course.modules.flatMap((module) => module.lessons);
  const nextLesson = lessons.find((lesson) => !lesson.completed) ?? lessons[0];
  const completedLessons = lessons.filter((lesson) => lesson.completed).length;
  const totalDuration = formatDuration(course.totalDuration);

  return (
    <section
      aria-label={`Progresso do curso ${course.title}`}
      style={{ ...styles.card, marginBottom: spacingAfter }}
    >
      <div style={styles.meta}>
        <span style={styles.category}>
          <GraduationCap size={14} />
          {course.category}
        </span>
        <span style={styles.separator}>•</span>
        <span style={styles.metaItem}>
          <Clock size={13} />
          {totalDuration} no total
        </span>
        <span style={styles.separator}>•</span>
        <span style={styles.metaText}>
          {completedLessons} de {lessons.length} aulas concluídas
        </span>
        {contentCount && <span style={styles.metaText}>{contentCount}</span>}
      </div>

      <h1 style={styles.title}>
        {onOpenCourse ? (
          <button type="button" onClick={() => onOpenCourse(course.id)} style={styles.titleButton}>
            {course.title}
          </button>
        ) : (
          course.title
        )}
      </h1>
      {course.description && <p style={styles.description}>{course.description}</p>}

      <div style={styles.progressSection}>
        <div style={styles.progressLabel}>
          <span>Progresso do Curso</span>
          <strong>{course.progress}% concluído</strong>
        </div>
        <div
          role="progressbar"
          aria-label="Progresso do curso"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={course.progress}
          style={styles.progressTrack}
        >
          <div style={{ ...styles.progressFill, width: `${course.progress}%` }} />
        </div>
        <div style={styles.actions}>
          {nextLesson && onPlayLesson && (
            <button
              type="button"
              onClick={() => onPlayLesson(course.id, nextLesson.id)}
              aria-label={`Continuar: ${nextLesson.title}`}
              style={styles.continueButton}
            >
              <Play size={16} fill="#0D111B" />
              Continuar: {nextLesson.title}
            </button>
          )}
          {onEditCourse && (
            <button
              type="button"
              onClick={() => onEditCourse(course.id)}
              aria-label="Editar organização do curso"
              style={styles.editButton}
            >
              <Edit size={16} />
              Editar Curso
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes > 0 ? `${minutes}min` : ''}` : `${minutes}min`;
}
