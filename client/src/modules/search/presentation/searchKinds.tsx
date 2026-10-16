import React from 'react';
import { GraduationCap, Film, FileText, Play, Layers } from 'lucide-react';
import type { SearchFilter, SearchResultKind } from '@/core/domain/library';

export const FILTER_TABS: { id: SearchFilter; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'Todos', icon: <Layers size={13} /> },
  { id: 'course', label: 'Cursos', icon: <GraduationCap size={13} /> },
  { id: 'lesson', label: 'Aulas', icon: <Play size={13} /> },
  { id: 'movie', label: 'Filmes', icon: <Film size={13} /> },
  { id: 'document', label: 'PDFs', icon: <FileText size={13} /> },
];

export const KIND_COLORS: Record<SearchResultKind, string> = {
  course: '#A594FF',
  lesson: '#60A5FA',
  movie: '#10B981',
  document: '#F59E0B',
};

export const KIND_LABELS: Record<SearchResultKind, string> = {
  course: 'CURSO',
  lesson: 'AULA',
  movie: 'FILME',
  document: 'PDF',
};

export const KIND_ICONS: Record<SearchResultKind, React.ReactNode> = {
  course: <GraduationCap size={15} />,
  lesson: <Play size={15} />,
  movie: <Film size={15} />,
  document: <FileText size={15} />,
};
