import React, { useState } from 'react';
import { Course, Lesson, Material } from '../../types/library';
import { 
  ArrowLeft, 
  Play, 
  CheckCircle2, 
  Circle, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Code, 
  ExternalLink, 
  GraduationCap 
} from 'lucide-react';

interface CourseDetailsViewProps {
  course: Course;
  onBack: () => void;
  onToggleLesson: (courseId: string, lessonId: string) => void;
  onPlayLesson?: (courseId: string, lessonId: string) => void;
  onOpenMaterial?: (material: Material) => void;
}

export const CourseDetailsView: React.FC<CourseDetailsViewProps> = ({
  course,
  onBack,
  onToggleLesson,
  onPlayLesson,
  onOpenMaterial,
}) => {
  // Inicialmente expande todos os módulos para visualização rápida e sem atrito
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    course.modules.forEach(m => {
      initial[m.id] = true;
    });
    return initial;
  });

  const toggleModuleExpand = (moduleId: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const formatSeconds = (sec: number): string => {
    const minutes = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${minutes}:${remainder.toString().padStart(2, '0')}`;
  };

  const formatTotalDuration = (sec: number): string => {
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes > 0 ? `${minutes}min` : ''}`;
    }
    return `${minutes}min`;
  };

  // Encontra a próxima aula não concluída
  const getNextLesson = (): Lesson | undefined => {
    for (const mod of course.modules) {
      for (const les of mod.lessons) {
        if (!les.completed) return les;
      }
    }
    return course.modules[0]?.lessons[0];
  };

  const nextLesson = getNextLesson();
  const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const completedLessons = course.modules.reduce(
    (acc, m) => acc + m.lessons.filter(l => l.completed).length,
    0
  );

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

      {/* Course Banner Card */}
      <div 
        style={{
          backgroundColor: '#141A28',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '32px',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* Subtle background glow */}
        <div 
          style={{
            position: 'absolute',
            top: '-60px',
            right: '-60px',
            width: '260px',
            height: '260px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(165, 148, 255, 0.15) 0%, rgba(13, 17, 27, 0) 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span 
            style={{
              backgroundColor: 'rgba(165, 148, 255, 0.15)',
              color: '#A594FF',
              fontSize: '12px',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <GraduationCap size={14} />
            {course.category}
          </span>
          <span style={{ color: '#64748B', fontSize: '13px' }}>•</span>
          <span style={{ color: '#94A3B8', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Clock size={13} />
            {formatTotalDuration(course.totalDuration)} no total
          </span>
          <span style={{ color: '#64748B', fontSize: '13px' }}>•</span>
          <span style={{ color: '#94A3B8', fontSize: '13px' }}>
            {completedLessons} de {totalLessons} aulas concluídas
          </span>
        </div>

        <h1 
          style={{
            fontSize: '30px',
            fontWeight: 700,
            color: '#FFFFFF',
            lineHeight: '1.25',
            letterSpacing: '-0.5px',
          }}
        >
          {course.title}
        </h1>

        <p 
          style={{
            color: '#94A3B8',
            fontSize: '15px',
            lineHeight: '1.6',
            maxWidth: '900px',
          }}
        >
          {course.description}
        </p>

        {/* Progress Bar & Actions */}
        <div 
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            paddingTop: '10px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#F0F4FC', fontSize: '13px', fontWeight: 600 }}>
              Progresso do Curso
            </span>
            <span style={{ color: '#A594FF', fontSize: '13px', fontWeight: 700 }}>
              {course.progress}% concluído
            </span>
          </div>

          <div 
            style={{
              width: '100%',
              height: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '999px',
              overflow: 'hidden',
            }}
          >
            <div 
              style={{
                width: `${course.progress}%`,
                height: '100%',
                backgroundColor: '#A594FF',
                boxShadow: '0 0 12px rgba(165, 148, 255, 0.6)',
                borderRadius: '999px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>

          {/* Quick Continue Action Button */}
          {nextLesson && (
            <div style={{ marginTop: '8px' }}>
              <button
                onClick={() => onPlayLesson && onPlayLesson(course.id, nextLesson.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: '#A594FF',
                  color: '#0D111B',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                  boxShadow: '0 4px 14px rgba(165, 148, 255, 0.3)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#8D77FF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#A594FF';
                }}
              >
                <Play size={16} fill="#0D111B" />
                Continuar: {nextLesson.title}
              </button>
            </div>
          )}
        </div>
      </div>

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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {course.modules.map((mod) => {
            const isExpanded = !!expandedModules[mod.id];
            const modCompletedLessons = mod.lessons.filter(l => l.completed).length;

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
                      {modCompletedLessons}/{mod.lessons.length} aulas
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
                          backgroundColor: lesson.completed ? 'rgba(16, 185, 129, 0.02)' : 'transparent',
                          transition: 'background-color 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
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
                              onClick={() => onPlayLesson && onPlayLesson(course.id, lesson.id)}
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
                                e.currentTarget.style.backgroundColor = 'rgba(165, 148, 255, 0.12)';
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
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                    e.currentTarget.style.color = '#94A3B8';
                                  }}
                                >
                                  {isPdf && <FileText size={12} color="#A594FF" />}
                                  {isCode && <Code size={12} color="#10B981" />}
                                  {!isPdf && !isCode && <ExternalLink size={12} color="#F59E0B" />}
                                  <span>{mat.title}</span>
                                  {mat.fileSize && (
                                    <span style={{ color: '#64748B', fontSize: '10px' }}>({mat.fileSize})</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
