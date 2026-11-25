import React from 'react';
import { Sparkles } from 'lucide-react';
import type { OrganizationSuggestionStateView } from '@/modules/courses/domain/organization-suggestion';
import { Button } from '@/shared/ui/components/Button';
import { Spinner } from '@/shared/ui/components/Spinner';

export interface OrganizationSuggestionPanelProps {
  state: OrganizationSuggestionStateView | null;
  busy: boolean;
  error: string | null;
  /** Título de cada aula, para mostrar o intervalo coberto por módulo. */
  lessonTitles: ReadonlyMap<string, string>;
  onRequest(): void;
  onApply(): void;
  onDismiss(): void;
}

const card: React.CSSProperties = {
  backgroundColor: '#131A27',
  border: '1px solid rgba(165, 148, 255, 0.25)',
  borderRadius: '12px',
  padding: '16px',
  marginBottom: '32px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};
const muted: React.CSSProperties = { color: '#94A3B8', fontSize: '13px', margin: 0 };
const row: React.CSSProperties = { display: 'flex', gap: '8px', flexWrap: 'wrap' };

function lessonCount(count: number): string {
  return count === 1 ? '1 aula' : `${count} aulas`;
}

/** Proposta da IA local: só apresenta o que o núcleo devolveu. */
export const OrganizationSuggestionPanel: React.FC<OrganizationSuggestionPanelProps> = ({
  state,
  busy,
  error,
  lessonTitles,
  onRequest,
  onApply,
  onDismiss,
}) => {
  if (!state) return null;
  const suggestion = state.suggestion;
  const working = suggestion?.status === 'pending' || suggestion?.status === 'running';
  const title = (id: string) => lessonTitles.get(id) ?? id;

  return (
    <section aria-label="Reorganizar com IA" style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F0F4FC' }}>
        <Sparkles size={16} color="#A594FF" aria-hidden />
        <strong style={{ fontSize: '14px' }}>Organização por assunto</strong>
      </div>

      {suggestion?.status === 'ready' ? (
        <>
          <p style={muted}>
            A IA local sugeriu {suggestion.modules.length} módulos. Nada muda até você aplicar;
            depois dá para ajustar em Editar Curso.
          </p>
          <ol aria-label="Módulos sugeridos pela IA" style={{ margin: 0, paddingLeft: '20px' }}>
            {suggestion.modules.map((module, index) => (
              <li key={`${index}-${module.title}`} style={{ color: '#F0F4FC', fontSize: '13px' }}>
                <strong>{module.title}</strong>{' '}
                <span style={{ color: '#94A3B8' }}>
                  · {lessonCount(module.lessonIds.length)}
                  {module.lessonIds.length > 1 &&
                    ` · ${title(module.lessonIds[0])} → ${title(module.lessonIds[module.lessonIds.length - 1])}`}
                </span>
              </li>
            ))}
          </ol>
          <div style={row}>
            <Button size="sm" onClick={onApply} disabled={busy}>
              Aplicar sugestão
            </Button>
            <Button variant="ghost" size="sm" onClick={onDismiss} disabled={busy}>
              Descartar
            </Button>
          </div>
        </>
      ) : working ? (
        <p role="status" style={{ ...muted, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Spinner size={12} />A IA está analisando as aulas. Isso roda em segundo plano e pode
          esperar o fim da reprodução.
        </p>
      ) : (
        <>
          <p style={muted}>
            {state.available
              ? 'A IA local agrupa as aulas em módulos por assunto. Você revisa antes de aplicar.'
              : 'Ative a IA local em Configurações para reorganizar este curso com IA.'}
          </p>
          <div style={row}>
            <Button
              variant="secondary"
              size="sm"
              onClick={onRequest}
              disabled={!state.available || busy}
            >
              {suggestion?.status === 'failed' ? 'Tentar de novo' : 'Reorganizar com IA'}
            </Button>
          </div>
        </>
      )}

      {(error ?? (suggestion?.status === 'failed' ? suggestion.error : null)) && (
        <p role="alert" style={{ ...muted, color: '#F87171' }}>
          {error ?? `Não foi possível gerar a sugestão: ${suggestion?.error}`}
        </p>
      )}
    </section>
  );
};

OrganizationSuggestionPanel.displayName = 'OrganizationSuggestionPanel';
