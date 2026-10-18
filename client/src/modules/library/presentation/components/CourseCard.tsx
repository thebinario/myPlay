import React from 'react';
import { PlayCircle, GraduationCap, Clock } from 'lucide-react';
import type { Course } from '@/core/domain/library';
import { countCourseLessons } from '@/core/domain/collection';

interface CourseCardProps {
  course: Course;
  onSelect?: (courseId: string) => void;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`.trim();
  return `${minutes}m`;
}

/**
 * Card enxuto de curso, exibido dentro de uma coleção. Espelha o
 * `CollectionCard` para manter a leitura uniforme da hierarquia; o clique abre
 * o detalhe do curso.
 */
export const CourseCard: React.FC<CourseCardProps> = ({ course, onSelect }) => {
  const lessons = countCourseLessons(course);

  return (
    <button
      type="button"
      onClick={onSelect ? () => onSelect(course.id) : undefined}
      disabled={!onSelect}
      style={styles.card}
    >
      <div style={styles.cover}>
        {course.coverUrl ? (
          <img src={course.coverUrl} alt="" style={styles.coverImage} />
        ) : (
          <GraduationCap size={30} color="#A594FF" />
        )}
      </div>

      <div style={styles.body}>
        <div style={styles.header}>
          <span style={styles.category}>{course.category || 'Curso'}</span>
          <span style={styles.play}>
            <PlayCircle size={16} color="#A594FF" />
          </span>
        </div>

        <h3 style={styles.title}>{course.title}</h3>

        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${course.progress}%` }} />
        </div>

        <div style={styles.footer}>
          <span style={styles.metric}>
            <Clock size={13} />
            {formatDuration(course.totalDuration)}
          </span>
          <span style={styles.metric}>
            {lessons} {lessons === 1 ? 'aula' : 'aulas'}
          </span>
          <span style={styles.percent}>
            {course.progress > 0 ? `${course.progress}%` : 'Não iniciado'}
          </span>
        </div>
      </div>
    </button>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: 'flex',
    flexDirection: 'column',
    padding: 0,
    textAlign: 'left',
    width: '100%',
    backgroundColor: '#141A28',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12,
    overflow: 'hidden',
    cursor: 'pointer',
    color: '#F0F4FC',
    font: 'inherit',
  },
  cover: {
    width: '100%',
    height: 120,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B0F19',
    backgroundImage: 'linear-gradient(135deg, #1A2234 0%, #101624 100%)',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    opacity: 0.88,
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: 16,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  category: {
    fontSize: 11,
    fontWeight: 600,
    color: '#94A3B8',
    letterSpacing: '0.02em',
  },
  play: {
    display: 'inline-flex',
  },
  title: {
    fontSize: 15,
    fontWeight: 600,
    lineHeight: 1.35,
    margin: 0,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  progressTrack: {
    width: '100%',
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#A594FF',
    boxShadow: '0 0 8px #A594FF',
    transition: 'width 0.3s ease',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    fontSize: 12,
    color: '#94A3B8',
  },
  metric: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
  },
  percent: {
    marginLeft: 'auto',
    fontWeight: 600,
    color: '#A594FF',
  },
};
