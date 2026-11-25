import React, { useState } from 'react';
import { BookOpen, FolderOpen, Search } from 'lucide-react';
import type { StudyCourseOptionView } from '@/modules/study/domain/study';
import { useCourseOptions } from '@/modules/study/presentation/hooks/useCourseOptions';
import { ErrorNote, fieldStyle, STUDY_THEME } from './study-ui';

interface CoursePickerProps {
  inputId: string;
  selectedId: string | null;
  onSelect: (course: StudyCourseOptionView) => void;
}

/** "Biblioteca › Coleção › Curso": o mesmo caminho da tela Biblioteca. */
export const coursePath = (course: StudyCourseOptionView) =>
  [course.libraryName, course.collectionTitle, course.title].filter(Boolean).join(' › ');

const countLabel = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

/**
 * Escolha do curso de uma nova trilha: pesquisa (feita no núcleo) e lista
 * agrupada por biblioteca, para não confundir cursos de bibliotecas diferentes.
 */
export const CoursePicker: React.FC<CoursePickerProps> = ({ inputId, selectedId, onSelect }) => {
  const [query, setQuery] = useState('');
  const { libraries, loading, error } = useCourseOptions(query);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ position: 'relative' }}>
        <Search
          size={14}
          aria-hidden
          style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
          color={STUDY_THEME.faint}
        />
        <input
          id={inputId}
          type="search"
          aria-label="Pesquisar curso"
          placeholder="Pesquisar curso ou biblioteca"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ ...fieldStyle, paddingLeft: '30px' }}
        />
      </div>
      <ErrorNote message={error} />
      <div
        role="listbox"
        aria-label="Cursos da biblioteca"
        aria-busy={loading}
        style={{
          maxHeight: '260px',
          overflowY: 'auto',
          border: `1px solid ${STUDY_THEME.border}`,
          borderRadius: '10px',
          background: STUDY_THEME.input,
          padding: '6px',
        }}
      >
        {!loading && libraries.length === 0 && (
          <p style={{ margin: '8px', color: STUDY_THEME.muted, fontSize: '13px' }}>
            {query.trim() ? 'Nenhum curso encontrado.' : 'Nenhum curso na biblioteca ainda.'}
          </p>
        )}
        {libraries.map((library) => (
          <div key={library.sourceId ?? 'loose'} role="group" aria-label={library.libraryName}>
            <div
              aria-hidden
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 8px 4px',
                color: STUDY_THEME.muted,
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              <FolderOpen size={13} />
              {library.libraryName}
            </div>
            {library.courses.map((course) => (
              <CourseOption
                key={course.courseId}
                course={course}
                selected={course.courseId === selectedId}
                onSelect={onSelect}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const CourseOption: React.FC<{
  course: StudyCourseOptionView;
  selected: boolean;
  onSelect: (course: StudyCourseOptionView) => void;
}> = ({ course, selected, onSelect }) => (
  <button
    type="button"
    role="option"
    aria-selected={selected}
    aria-label={`${[course.collectionTitle, course.title].filter(Boolean).join(' › ')}, ${countLabel(course.moduleCount, 'módulo', 'módulos')} · ${countLabel(course.lessonCount, 'aula', 'aulas')}`}
    onClick={() => onSelect(course)}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      width: '100%',
      textAlign: 'left',
      padding: '8px 8px 8px 22px',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      background: selected ? 'rgba(165, 148, 255, 0.16)' : 'transparent',
      color: selected ? STUDY_THEME.strong : STUDY_THEME.text,
      fontSize: '13px',
    }}
  >
    <BookOpen size={14} aria-hidden color={selected ? STUDY_THEME.accent : STUDY_THEME.faint} />
    <span style={{ flex: 1, minWidth: 0 }}>
      {course.collectionTitle && (
        <span style={{ color: STUDY_THEME.faint }}>{course.collectionTitle} › </span>
      )}
      {course.title}
    </span>
    <span style={{ color: STUDY_THEME.faint, fontSize: '11px', whiteSpace: 'nowrap' }}>
      {countLabel(course.moduleCount, 'módulo', 'módulos')} ·{' '}
      {countLabel(course.lessonCount, 'aula', 'aulas')}
    </span>
  </button>
);
