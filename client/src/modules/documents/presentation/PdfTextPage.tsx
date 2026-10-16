import React from 'react';
import { BookOpen } from 'lucide-react';
import type { PdfColorMode, PdfPageChunk } from '@/core/domain/library';

interface PdfTextPageProps {
  title: string;
  currentPage: number;
  totalPages: number;
  zoom: number;
  colorMode: PdfColorMode;
  isLoading: boolean;
  content?: PdfPageChunk;
}

/** Página textual de fallback (jsdom ou PDF ainda não carregado). */
export const PdfTextPage: React.FC<PdfTextPageProps> = ({
  title,
  currentPage,
  totalPages,
  zoom,
  colorMode,
  isLoading,
  content,
}) => {
  const borderColor = colorMode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0';
  const mutedColor = colorMode === 'dark' ? '#8B949E' : '#64748B';

  return (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          borderBottom: borderColor,
          paddingBottom: '12px',
          marginBottom: '28px',
          fontSize: `${Math.round(11 * zoom)}px`,
          color: mutedColor,
        }}
      >
        <span>{title}</span>
        <span>Capítulo {Math.ceil(currentPage / 10)}</span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h2
          style={{
            fontSize: `${Math.round(20 * zoom)}px`,
            fontWeight: 700,
            color: colorMode === 'dark' ? '#FFFFFF' : '#0F172A',
            letterSpacing: '-0.3px',
          }}
        >
          Página {currentPage}: {title.replace('.pdf', '')}
        </h2>

        <p
          style={{
            fontSize: `${Math.round(14 * zoom)}px`,
            lineHeight: '1.7',
            color: colorMode === 'dark' ? '#CBD5E1' : '#334155',
          }}
        >
          {content?.content ||
            (isLoading
              ? 'Carregando página...'
              : 'Conteúdo da página estruturado em blocos de texto formatados.')}
        </p>

        <div
          style={{
            backgroundColor: colorMode === 'dark' ? '#101520' : '#F8FAFC',
            border:
              colorMode === 'dark' ? '1px solid rgba(165, 148, 255, 0.2)' : '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '16px',
            marginTop: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <BookOpen size={16} color="#A594FF" />
            <span
              style={{ fontSize: `${Math.round(12 * zoom)}px`, fontWeight: 600, color: '#A594FF' }}
            >
              Nota Arquitetural
            </span>
          </div>
          <p
            style={{ fontSize: `${Math.round(12 * zoom)}px`, color: mutedColor, lineHeight: '1.6' }}
          >
            A inversão de controle permite que módulos de alto nível não dependam de detalhes de
            implementação. Em aplicações desktop com Tauri e React, desacoplar os adaptadores de I/O
            preserva a testabilidade do core da aplicação.
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          borderTop: borderColor,
          paddingTop: '12px',
          marginTop: '32px',
          fontSize: `${Math.round(11 * zoom)}px`,
          color: mutedColor,
        }}
      >
        <span>MIDOTECA — Leitura Digital</span>
        <span>
          Página {currentPage} de {totalPages || '—'}
        </span>
      </div>
    </>
  );
};
