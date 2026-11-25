import React from 'react';
import { BookOpen, FolderOpen } from 'lucide-react';
import type { StudyCourseLibraryView, StudyCourseOptionView } from '@/modules/study/domain/study';
import { STUDY_THEME } from './study-ui';

/** O que a nova trilha cobre: um curso ou uma biblioteca inteira. */
export type CourseSelection =
  | { kind: 'course'; course: StudyCourseOptionView }
  | { kind: 'library'; sourceId: string; libraryName: string };

/** Caminho como na tela Biblioteca: "Biblioteca › Coleção › Curso". */
export function selectionPath(selection: CourseSelection): string {
  if (selection.kind === 'library') return `${selection.libraryName} › todos os cursos`;
  const { course } = selection;
  return [course.libraryName, course.collectionTitle, course.title].filter(Boolean).join(' › ');
}

const countLabel = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

const optionStyle = (selected: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  width: '100%',
  textAlign: 'left',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  background: selected ? 'rgba(165, 148, 255, 0.16)' : 'transparent',
  color: selected ? STUDY_THEME.strong : STUDY_THEME.text,
});

const headerText: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
};

/**
 * Cabeçalho do grupo. Uma biblioteca de verdade pode ser escolhida inteira;
 * "Cursos avulsos" (sem biblioteca) é só um título.
 */
export const LibraryOption: React.FC<{
  library: StudyCourseLibraryView;
  selected: boolean;
  onSelect: (selection: CourseSelection) => void;
}> = ({ library, selected, onSelect }) => {
  const { sourceId, libraryName } = library;
  if (sourceId === null) {
    return (
      <div aria-hidden style={{ ...optionStyle(false), cursor: 'default', padding: '8px' }}>
        <FolderOpen size={13} color={STUDY_THEME.muted} />
        <span style={{ ...headerText, color: STUDY_THEME.muted }}>{libraryName}</span>
      </div>
    );
  }
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      aria-label={`Biblioteca inteira: ${libraryName}`}
      onClick={() => onSelect({ kind: 'library', sourceId, libraryName })}
      style={{ ...optionStyle(selected), padding: '8px' }}
    >
      <FolderOpen size={13} aria-hidden color={selected ? STUDY_THEME.accent : STUDY_THEME.muted} />
      <span style={{ ...headerText, color: selected ? STUDY_THEME.strong : STUDY_THEME.muted }}>
        {libraryName}
      </span>
      <span
        style={{
          fontSize: '11px',
          color: selected ? STUDY_THEME.accent : STUDY_THEME.faint,
          border: `1px solid ${selected ? STUDY_THEME.accent : STUDY_THEME.border}`,
          borderRadius: '999px',
          padding: '1px 8px',
          whiteSpace: 'nowrap',
        }}
      >
        Biblioteca inteira
      </span>
    </button>
  );
};

export const CourseOption: React.FC<{
  course: StudyCourseOptionView;
  selected: boolean;
  onSelect: (selection: CourseSelection) => void;
}> = ({ course, selected, onSelect }) => {
  const counts = `${countLabel(course.moduleCount, 'módulo', 'módulos')} · ${countLabel(course.lessonCount, 'aula', 'aulas')}`;
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      aria-label={`${[course.collectionTitle, course.title].filter(Boolean).join(' › ')}, ${counts}`}
      onClick={() => onSelect({ kind: 'course', course })}
      style={{ ...optionStyle(selected), padding: '8px 8px 8px 22px', fontSize: '13px' }}
    >
      <BookOpen size={14} aria-hidden color={selected ? STUDY_THEME.accent : STUDY_THEME.faint} />
      <span style={{ flex: 1, minWidth: 0 }}>
        {course.collectionTitle && (
          <span style={{ color: STUDY_THEME.faint }}>{course.collectionTitle} › </span>
        )}
        {course.title}
      </span>
      <span style={{ color: STUDY_THEME.faint, fontSize: '11px', whiteSpace: 'nowrap' }}>
        {counts}
      </span>
    </button>
  );
};
