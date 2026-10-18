import React, { useState } from 'react';
import { Course, Document, Material } from '@/core/domain/library';
import {
  ArrowLeft,
  Play,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  FileText,
  Code,
  ExternalLink,
} from 'lucide-react';
import { CourseProgressCard } from './CourseProgressCard';

interface CourseDetailsViewProps {
  course: Course;
  libraryDocuments?: Document[];
  onBack: () => void;
  onToggleLesson: (courseId: string, lessonId: string) => void;
  onPlayLesson?: (courseId: string, lessonId: string) => void;
  onOpenMaterial?: (material: Material) => void;
  onOpenDocument?: (documentId: string) => void;
  onToggleDocumentRead?: (documentId: string) => void;
  onEditCourse?: (courseId: string) => void;
}

export const CourseDetailsView: React.FC<CourseDetailsViewProps> = ({
  course,
  libraryDocuments = [],
  onBack,
  onToggleLesson,
  onPlayLesson,
  onOpenMaterial,
  onOpenDocument,
  onToggleDocumentRead,
  onEditCourse,
}) => {
  // Inicialmente expande todos os módulos para visualização rápida e sem atrito
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    course.modules.forEach((m) => {
      initial[m.id] = true;
    });
    return initial;
  });

  const toggleModuleExpand = (moduleId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  const formatSeconds = (sec: number): string => {
    const minutes = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${minutes}:${remainder.toString().padStart(2, '0')}`;
  };

  const moduleDocumentIds = new Set(
    course.modules.flatMap((module) => module.documents?.map((document) => document.id) ?? []),
  );
  const courseDocuments = [
    ...new Map(
      [...(course.documents ?? []), ...libraryDocuments]
        .filter((document) => !moduleDocumentIds.has(document.id))
        .map((document) => [document.id, document]),
    ).values(),
  ];

  // Agrupa por seção quando o curso tem seções. Sem elas, os módulos são a
  // projeção plana (compatibilidade). Necessário porque módulos de seções
  // distintas podem compartilhar o mesmo título (ex.: "Aulas" em várias seções).
  const firstModuleId = course.modules[0]?.id;
  const sectionGroups =
    course.sections && course.sections.length > 0
      ? course.sections.map((section) => ({
          id: section.id,
          title: section.title as string | null,
          modules: section.modules,
        }))
      : [{ id: '__all__', title: null as string | null, modules: course.modules }];

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* Back button */}
      <button
        onClick={onBack}
        aria-label="Voltar para a biblioteca"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'transparent',
          border: 'none',
          color: '#94A3B8',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          marginBottom: '24px',
          padding: '6px 10px',
          borderRadius: '6px',
          transition: 'all 0.15s ease-in-out',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#A594FF';
          e.currentTarget.style.backgroundColor = 'rgba(165, 148, 255, 0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#94A3B8';
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <ArrowLeft size={16} />
        Voltar para a biblioteca
      </button>

      <CourseProgressCard
        course={course}
        spacingAfter={32}
        onPlayLesson={onPlayLesson}
        onEditCourse={onEditCourse}
      />

      {/* Modules and Lessons Section */}
      <div>
        <h2
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#FFFFFF',
            marginBottom: '16px',
          }}
        >
          Grade de Módulos e Conteúdo
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {sectionGroups.map((group) => (
            <div key={group.id}>
              {group.title && (
                <h3
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#94A3B8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '12px',
                  }}
                >
                  {group.title}
                </h3>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {group.modules.map((mod) => {
                  const isExpanded = !!expandedModules[mod.id];
                  const modCompletedLessons = mod.lessons.filter((l) => l.completed).length;
                  const moduleDocuments = [
                    ...(mod.documents ?? []),
                    ...(mod.id === firstModuleId ? courseDocuments : []),
                  ];

                  return (
                    <div
                      key={mod.id}
                      style={{
                        backgroundColor: '#141A28',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '12px',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Module Header Bar */}
                      <div
                        onClick={() => toggleModuleExpand(mod.id)}
                        style={{
                          padding: '16px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          backgroundColor: isExpanded ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                          userSelect: 'none',
                          transition: 'background-color 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#F0F4FC' }}>
                            {mod.title}
                          </h3>
                          <span
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.06)',
                              color: '#94A3B8',
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                            }}
                          >
                            {modCompletedLessons}/{mod.lessons.length} aulas ·{' '}
                            {moduleDocuments.length} PDFs
                          </span>
                        </div>

                        <div style={{ color: '#8B949E' }}>
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </div>

                      {/* Lessons list inside module */}
                      {isExpanded && (
                        <div
                          style={{
                            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                            display: 'flex',
                            flexDirection: 'column',
                          }}
                        >
                          {mod.lessons.map((lesson) => (
                            <div
                              key={lesson.id}
                              style={{
                                padding: '14px 20px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                                backgroundColor: lesson.completed
                                  ? 'rgba(16, 185, 129, 0.02)'
                                  : 'transparent',
                                transition: 'background-color 0.15s',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    flex: 1,
                                  }}
                                >
                                  {/* Checkbox de conclusão */}
                                  <button
                                    onClick={() => onToggleLesson(course.id, lesson.id)}
                                    aria-label={`Marcar ${lesson.title} como ${lesson.completed ? 'não concluída' : 'concluída'}`}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      cursor: 'pointer',
                                      color: lesson.completed ? '#10B981' : '#64748B',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      padding: '4px',
                                      borderRadius: '4px',
                                    }}
                                    title={lesson.completed ? 'Concluída' : 'Marcar como concluída'}
                                  >
                                    {lesson.completed ? (
                                      <CheckCircle2 size={18} color="#10B981" />
                                    ) : (
                                      <Circle size={18} color="#64748B" />
                                    )}
                                  </button>

                                  {/* Title of lesson */}
                                  <span
                                    style={{
                                      fontSize: '14px',
                                      color: lesson.completed ? '#94A3B8' : '#F0F4FC',
                                      textDecoration: lesson.completed ? 'line-through' : 'none',
                                      fontWeight: 500,
                                    }}
                                  >
                                    {lesson.title}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                  <span style={{ fontSize: '12px', color: '#64748B' }}>
                                    {formatSeconds(lesson.duration)}
                                  </span>

                                  <button
                                    onClick={() =>
                                      onPlayLesson && onPlayLesson(course.id, lesson.id)
                                    }
                                    aria-label={`Assistir aula ${lesson.title}`}
                                    style={{
                                      background: 'rgba(165, 148, 255, 0.12)',
                                      color: '#A594FF',
                                      border: 'none',
                                      borderRadius: '6px',
                                      padding: '6px 10px',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = '#A594FF';
                                      e.currentTarget.style.color = '#0D111B';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor =
                                        'rgba(165, 148, 255, 0.12)';
                                      e.currentTarget.style.color = '#A594FF';
                                    }}
                                  >
                                    <Play size={12} fill="currentColor" />
                                    Assistir
                                  </button>
                                </div>
                              </div>

                              {/* Complementary materials for lesson */}
                              {lesson.materials && lesson.materials.length > 0 && (
                                <div
                                  style={{
                                    marginLeft: '34px',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '8px',
                                    marginTop: '2px',
                                  }}
                                >
                                  {lesson.materials.map((mat) => {
                                    const isPdf = mat.type === 'pdf';
                                    const isCode = mat.type === 'code';

                                    return (
                                      <button
                                        key={mat.id}
                                        onClick={() => onOpenMaterial && onOpenMaterial(mat)}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                          backgroundColor: '#121622',
                                          border: '1px solid rgba(255, 255, 255, 0.08)',
                                          borderRadius: '6px',
                                          padding: '4px 10px',
                                          fontSize: '11px',
                                          color: '#94A3B8',
                                          cursor: 'pointer',
                                          transition: 'all 0.15s',
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.borderColor = '#A594FF';
                                          e.currentTarget.style.color = '#F0F4FC';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.borderColor =
                                            'rgba(255, 255, 255, 0.08)';
                                          e.currentTarget.style.color = '#94A3B8';
                                        }}
                                      >
                                        {isPdf && <FileText size={12} color="#A594FF" />}
                                        {isCode && <Code size={12} color="#10B981" />}
                                        {!isPdf && !isCode && (
                                          <ExternalLink size={12} color="#F59E0B" />
                                        )}
                                        <span>{mat.title}</span>
                                        {mat.fileSize && (
                                          <span style={{ color: '#64748B', fontSize: '10px' }}>
                                            ({mat.fileSize})
                                          </span>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                          {moduleDocuments.map((document) => {
                            const isRead = document.isRead ?? !!document.readingState?.completedAt;
                            return (
                              <div
                                key={document.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  padding: '0 20px',
                                  borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                                }}
                              >
                                <button
                                  type="button"
                                  aria-label={`Marcar ${document.title} como ${isRead ? 'não lido' : 'lido'}`}
                                  title={isRead ? 'Marcar como não lido' : 'Marcar como lido'}
                                  onClick={() => onToggleDocumentRead?.(document.id)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '4px',
                                    border: 0,
                                    borderRadius: '50%',
                                    background: 'transparent',
                                    color: isRead ? '#10B981' : '#64748B',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {isRead ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Abrir PDF ${document.title}`}
                                  onClick={() => onOpenDocument?.(document.id)}
                                  style={{
                                    display: 'flex',
                                    flex: 1,
                                    minWidth: 0,
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '14px 0 14px 12px',
                                    border: 0,
                                    background: 'transparent',
                                    color: '#F0F4FC',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <FileText size={16} color="#A594FF" />
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {document.title}
                                  </span>
                                  <span style={{ marginLeft: 'auto', color: '#64748B' }}>
                                    {document.totalPages > 0
                                      ? `${document.totalPages} págs`
                                      : 'PDF'}
                                  </span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
