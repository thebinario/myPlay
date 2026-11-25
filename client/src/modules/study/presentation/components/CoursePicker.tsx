import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useCourseOptions } from '@/modules/study/presentation/hooks/useCourseOptions';
import { CourseOption, LibraryOption, type CourseSelection } from './CoursePickerOptions';
import { ErrorNote, fieldStyle, STUDY_THEME } from './study-ui';

interface CoursePickerProps {
  inputId: string;
  selection: CourseSelection | null;
  onSelect: (selection: CourseSelection) => void;
}

/**
 * Escolha do que a nova trilha cobre: pesquisa (feita no núcleo) e lista
 * agrupada por biblioteca. Dá para escolher um curso ou a biblioteca inteira.
 */
export const CoursePicker: React.FC<CoursePickerProps> = ({ inputId, selection, onSelect }) => {
  const [query, setQuery] = useState('');
  const { libraries, loading, error } = useCourseOptions(query);
  const selectedCourse = selection?.kind === 'course' ? selection.course.courseId : null;
  const selectedLibrary = selection?.kind === 'library' ? selection.sourceId : null;

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
            <LibraryOption
              library={library}
              selected={library.sourceId !== null && library.sourceId === selectedLibrary}
              onSelect={onSelect}
            />
            {library.courses.map((course) => (
              <CourseOption
                key={course.courseId}
                course={course}
                selected={course.courseId === selectedCourse}
                onSelect={onSelect}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
