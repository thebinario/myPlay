import React, { useState } from 'react';
import { Course, Lesson } from '../../types/library';
import { 
  ArrowLeft, 
  Save, 
  RotateCcw, 
  GripVertical, 
  ArrowUp, 
  ArrowDown, 
  Check, 
  GraduationCap 
} from 'lucide-react';
import { mockLibraryService } from '../../services/mockData';

interface CourseEditorViewProps {
  initialCourse: Course;
  onSave: (course: Course) => void;
  onBack: () => void;
}

export const CourseEditorView: React.FC<CourseEditorViewProps> = ({
  initialCourse,
  onSave,
  onBack,
}) => {
  // Estado local do curso em edição
  const [course, setCourse] = useState<Course>(() => JSON.parse(JSON.stringify(initialCourse)));
  // Pilha de histórico para desfazer (Undo)
  const [history, setHistory] = useState<Course[]>([]);
  // Feedback discreto de salvamento
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  // Estado para drag and drop
  const [draggedModuleIndex, setDraggedModuleIndex] = useState<number | null>(null);
  const [dragOverModuleIndex, setDragOverModuleIndex] = useState<number | null>(null);

  // Registra alteração na pilha de histórico
  const recordHistory = (nextCourse: Course) => {
    setHistory(prev => [...prev, JSON.parse(JSON.stringify(course))]);
    setCourse(nextCourse);
    setShowSavedFeedback(false);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory(prev => prev.slice(0, prev.length - 1));
    setCourse(previous);
    setShowSavedFeedback(false);
  };

  const handleCourseTitleChange = (newTitle: string) => {
    recordHistory({
      ...course,
      title: newTitle,
    });
  };

  const handleModuleTitleChange = (moduleId: string, newTitle: string) => {
    const updatedModules = course.modules.map(mod => 
      mod.id === moduleId ? { ...mod, title: newTitle } : mod
    );
    recordHistory({
      ...course,
      modules: updatedModules,
    });
  };

  const handleLessonTitleChange = (moduleId: string, lessonId: string, newTitle: string) => {
    const updatedModules = course.modules.map(mod => {
      if (mod.id !== moduleId) return mod;
      return {
        ...mod,
        lessons: mod.lessons.map(les => 
          les.id === lessonId ? { ...les, title: newTitle } : les
        ),
      };
    });
    recordHistory({
      ...course,
      modules: updatedModules,
    });
  };

  // Mover módulo para cima ou para baixo
  const moveModule = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= course.modules.length) return;
    const updated = [...course.modules];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    // Atualiza campo order
    updated.forEach((m, idx) => { m.order = idx + 1; });

    recordHistory({
      ...course,
      modules: updated,
    });
  };

  // Mover aula para outro módulo
  const moveLessonToModule = (sourceModuleId: string, lessonId: string, targetModuleId: string) => {
    if (sourceModuleId === targetModuleId) return;

    let lessonToMove: Lesson | null = null;

    // Remove do módulo de origem
    const intermediateModules = course.modules.map(mod => {
      if (mod.id === sourceModuleId) {
        const found = mod.lessons.find(l => l.id === lessonId);
        if (found) lessonToMove = { ...found, moduleId: targetModuleId };
        return {
          ...mod,
          lessons: mod.lessons.filter(l => l.id !== lessonId),
        };
      }
      return mod;
    });

    if (!lessonToMove) return;

    // Adiciona ao módulo de destino
    const finalModules = intermediateModules.map(mod => {
      if (mod.id === targetModuleId) {
        return {
          ...mod,
          lessons: [...mod.lessons, lessonToMove!],
        };
      }
      return mod;
    });

    recordHistory({
      ...course,
      modules: finalModules,
    });
  };

  // Drag and drop de módulos
  const handleDragStartModule = (index: number) => {
    setDraggedModuleIndex(index);
  };

  const handleDragOverModule = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverModuleIndex(index);
  };

  const handleDropModule = (dropIndex: number) => {
    if (draggedModuleIndex === null || draggedModuleIndex === dropIndex) {
      setDraggedModuleIndex(null);
      setDragOverModuleIndex(null);
      return;
    }
    moveModule(draggedModuleIndex, dropIndex);
    setDraggedModuleIndex(null);
    setDragOverModuleIndex(null);
  };

  const handleSaveAll = () => {
    const saved = mockLibraryService.saveCourse(course);
    onSave(saved);
    setShowSavedFeedback(true);
    setTimeout(() => {
      setShowSavedFeedback(false);
    }, 3500);
  };

  const handleDiscardChanges = () => {
    setCourse(JSON.parse(JSON.stringify(initialCourse)));
    setHistory([]);
    setShowSavedFeedback(false);
  };

  return (
    <div style={{ padding: '32px 40px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* Top Action Bar */}
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <button
          onClick={onBack}
          aria-label="Voltar para detalhes do curso"
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
            padding: '6px 12px',
            borderRadius: '6px',
            transition: 'all 0.15s ease',
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
          Voltar
        </button>

        {/* Action Controls: Undo, Discard, Save */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {showSavedFeedback && (
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#10B981',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              <Check size={16} />
              Alterações salvas com sucesso!
            </div>
          )}

          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            aria-label="Desfazer alteração"
            title="Desfazer última alteração"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#141A28',
              color: history.length > 0 ? '#F0F4FC' : '#64748B',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: history.length > 0 ? 'pointer' : 'not-allowed',
              opacity: history.length > 0 ? 1 : 0.5,
              transition: 'all 0.15s',
            }}
          >
            <RotateCcw size={15} />
            Desfazer ({history.length})
          </button>

          <button
            onClick={handleDiscardChanges}
            aria-label="Descartar alterações"
            style={{
              backgroundColor: 'transparent',
              color: '#EF4444',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Descartar
          </button>

          <button
            onClick={handleSaveAll}
            aria-label="Salvar alterações"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#A594FF',
              color: '#0D111B',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 20px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(165, 148, 255, 0.3)',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#8D77FF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#A594FF';
            }}
          >
            <Save size={16} />
            Salvar alterações
          </button>
        </div>
      </div>

      {/* Course Title Inline Editor Header */}
      <div 
        style={{
          backgroundColor: '#141A28',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '24px 32px',
          marginBottom: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span 
            style={{
              backgroundColor: 'rgba(165, 148, 255, 0.15)',
              color: '#A594FF',
              fontSize: '11px',
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <GraduationCap size={13} />
            Editor de Curso
          </span>
          <span style={{ color: '#64748B', fontSize: '12px' }}>
            Edição direta no item com suporte a reordenação
          </span>
        </div>

        <div>
          <label 
            htmlFor="course-title-input"
            style={{ fontSize: '11px', color: '#8B949E', textTransform: 'uppercase', letterSpacing: '0.5px' }}
          >
            Título do Curso (Edição Inline)
          </label>
          <input
            id="course-title-input"
            type="text"
            value={course.title}
            onChange={(e) => handleCourseTitleChange(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              color: '#FFFFFF',
              fontSize: '22px',
              fontWeight: 700,
              padding: '8px 12px',
              marginTop: '4px',
              outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#A594FF';
              e.currentTarget.style.backgroundColor = 'rgba(165, 148, 255, 0.04)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
            }}
          />
        </div>
      </div>

      {/* Modules List with Inline Editing & Drag and Drop */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF' }}>
            Estrutura de Módulos e Aulas
          </h2>
          <span style={{ fontSize: '12px', color: '#8B949E' }}>
            Arraste pelas alças ou use os botões para reordenar
          </span>
        </div>

        {course.modules.map((mod, modIdx) => {
          const isDragTarget = dragOverModuleIndex === modIdx && draggedModuleIndex !== modIdx;

          return (
            <div
              key={mod.id}
              data-testid={`module-section-${mod.id}`}
              draggable
              onDragStart={() => handleDragStartModule(modIdx)}
              onDragOver={(e) => handleDragOverModule(e, modIdx)}
              onDrop={() => handleDropModule(modIdx)}
              style={{
                backgroundColor: '#141A28',
                border: isDragTarget 
                  ? '2px dashed #A594FF' 
                  : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                transition: 'all 0.18s ease',
              }}
            >
              {/* Module Header with Inline Title and Movement buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div 
                  style={{ cursor: 'grab', color: '#64748B', display: 'flex', alignItems: 'center' }}
                  title="Arrastar módulo"
                >
                  <GripVertical size={20} />
                </div>

                <div style={{ flex: 1 }}>
                  <input
                    aria-label={`Título do módulo ${modIdx + 1}`}
                    type="text"
                    value={mod.title}
                    onChange={(e) => handleModuleTitleChange(mod.id, e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'transparent',
                      border: '1px solid transparent',
                      borderRadius: '6px',
                      color: '#F0F4FC',
                      fontSize: '16px',
                      fontWeight: 600,
                      padding: '4px 8px',
                      outline: 'none',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#A594FF';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'transparent';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  />
                </div>

                {/* Accessible movement buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    onClick={() => moveModule(modIdx, modIdx - 1)}
                    disabled={modIdx === 0}
                    aria-label={`Mover módulo "${mod.title}" para cima`}
                    title="Mover para cima"
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: modIdx === 0 ? '#475569' : '#94A3B8',
                      cursor: modIdx === 0 ? 'not-allowed' : 'pointer',
                      padding: '4px',
                      borderRadius: '4px',
                    }}
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    onClick={() => moveModule(modIdx, modIdx + 1)}
                    disabled={modIdx === course.modules.length - 1}
                    aria-label={`Mover módulo "${mod.title}" para baixo`}
                    title="Mover para baixo"
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: modIdx === course.modules.length - 1 ? '#475569' : '#94A3B8',
                      cursor: modIdx === course.modules.length - 1 ? 'not-allowed' : 'pointer',
                      padding: '4px',
                      borderRadius: '4px',
                    }}
                  >
                    <ArrowDown size={16} />
                  </button>
                </div>
              </div>

              {/* Lessons inside module */}
              <div 
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  paddingLeft: '32px',
                }}
              >
                {mod.lessons.map((lesson, lesIdx) => (
                  <div
                    key={lesson.id}
                    style={{
                      backgroundColor: '#121622',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: '#64748B', width: '20px' }}>
                      {lesIdx + 1}.
                    </span>

                    <input
                      aria-label={`Título da aula ${lesson.title}`}
                      type="text"
                      value={lesson.title}
                      onChange={(e) => handleLessonTitleChange(mod.id, lesson.id, e.target.value)}
                      style={{
                        flex: 1,
                        backgroundColor: 'transparent',
                        border: '1px solid transparent',
                        borderRadius: '4px',
                        color: '#E2E8F0',
                        fontSize: '13px',
                        padding: '4px 6px',
                        outline: 'none',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#A594FF';
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'transparent';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    />

                    {/* Mover para outro módulo select */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <label 
                        htmlFor={`move-select-${lesson.id}`}
                        style={{ fontSize: '11px', color: '#64748B' }}
                      >
                        Módulo:
                      </label>
                      <select
                        id={`move-select-${lesson.id}`}
                        aria-label={`Mover aula "${lesson.title}" para o módulo`}
                        value={mod.id}
                        onChange={(e) => moveLessonToModule(mod.id, lesson.id, e.target.value)}
                        style={{
                          backgroundColor: '#1A2234',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#A594FF',
                          fontSize: '11px',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          outline: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {course.modules.map(targetMod => (
                          <option key={targetMod.id} value={targetMod.id}>
                            {targetMod.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
