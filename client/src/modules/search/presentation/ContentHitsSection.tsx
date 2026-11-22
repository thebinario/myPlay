import React from 'react';
import { FileText, Subtitles } from 'lucide-react';
import type { ContentHitView } from '@/modules/search/domain/content-search';
import { useContentSearch } from '@/modules/search/presentation/hooks/useContentSearch';
import { splitHighlights } from '@/modules/search/presentation/highlight';
import { formatSeconds } from '@/modules/player/domain/progress';

interface ContentHitsSectionProps {
  query: string;
  onOpenLessonAt: (courseId: string, lessonId: string, seconds: number) => void;
  onOpenDocumentAt: (documentId: string, page: number) => void;
}

const cardStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  width: '100%',
  textAlign: 'left',
  background: '#141A28',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '10px',
  padding: '12px 14px',
  cursor: 'pointer',
  color: 'inherit',
};

function titleOf(hit: ContentHitView): string {
  if (hit.sourceKind === 'pdf') return `${hit.documentTitle ?? 'Documento'} · página ${hit.page}`;
  return `${hit.lessonTitle ?? 'Aula'} · ${formatSeconds((hit.startMs ?? 0) / 1000)}`;
}

function contextOf(hit: ContentHitView): string {
  if (hit.sourceKind === 'pdf') return 'PDF';
  const origin = hit.sourceKind === 'transcript' ? 'Transcrição' : 'Legenda';
  return hit.courseTitle ? `${origin} · ${hit.courseTitle}` : origin;
}

/**
 * Trechos de PDFs, legendas e transcrições encontrados pelo backend, com os
 * termos destacados. Clicar abre a página do PDF ou o vídeo no tempo exato.
 */
export const ContentHitsSection: React.FC<ContentHitsSectionProps> = ({
  query,
  onOpenLessonAt,
  onOpenDocumentAt,
}) => {
  const { hits } = useContentSearch(query);
  if (hits.length === 0) return null;

  const open = (hit: ContentHitView) => {
    if (hit.sourceKind === 'pdf' && hit.documentId) {
      onOpenDocumentAt(hit.documentId, hit.page ?? 1);
    } else if (hit.courseId && hit.lessonId) {
      onOpenLessonAt(hit.courseId, hit.lessonId, Math.floor((hit.startMs ?? 0) / 1000));
    }
  };

  return (
    <section aria-labelledby="content-hits-title" style={{ marginTop: '28px' }}>
      <h2
        id="content-hits-title"
        style={{
          color: '#94A3B8',
          fontSize: '12px',
          textTransform: 'uppercase',
          margin: '0 0 10px',
        }}
      >
        Trechos encontrados
      </h2>
      <div style={{ display: 'grid', gap: '8px' }}>
        {hits.map((hit) => {
          const Icon = hit.sourceKind === 'pdf' ? FileText : Subtitles;
          const title = titleOf(hit);
          return (
            <button
              key={hit.chunkId}
              type="button"
              aria-label={title}
              onClick={() => open(hit)}
              style={cardStyle}
            >
              <Icon size={18} color="#A594FF" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span style={{ display: 'grid', gap: '4px' }}>
                <span style={{ color: '#F0F4FC', fontSize: '13px', fontWeight: 600 }}>{title}</span>
                <span style={{ color: '#64748B', fontSize: '11px' }}>{contextOf(hit)}</span>
                <span style={{ color: '#CBD5E1', fontSize: '13px', lineHeight: 1.5 }}>
                  {splitHighlights(hit.snippet).map((part, index) =>
                    part.highlighted ? (
                      <mark
                        key={index}
                        style={{ background: 'rgba(165,148,255,0.25)', color: '#FFFFFF' }}
                      >
                        {part.text}
                      </mark>
                    ) : (
                      <React.Fragment key={index}>{part.text}</React.Fragment>
                    ),
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
