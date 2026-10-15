import React from 'react';
import { ArrowLeft, Check, RotateCcw, Save } from 'lucide-react';

interface EditorActionsProps {
  historyLength: number;
  showSavedFeedback: boolean;
  onBack: () => void;
  onUndo: () => void;
  onDiscard: () => void;
  onSave: () => void;
}

export const EditorActions: React.FC<EditorActionsProps> = ({
  historyLength,
  showSavedFeedback,
  onBack,
  onUndo,
  onDiscard,
  onSave,
}) => (
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
        onClick={onUndo}
        disabled={historyLength === 0}
        aria-label="Desfazer alteração"
        title="Desfazer última alteração"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: '#141A28',
          color: historyLength > 0 ? '#F0F4FC' : '#64748B',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '8px',
          padding: '8px 14px',
          fontSize: '13px',
          fontWeight: 500,
          cursor: historyLength > 0 ? 'pointer' : 'not-allowed',
          opacity: historyLength > 0 ? 1 : 0.5,
          transition: 'all 0.15s',
        }}
      >
        <RotateCcw size={15} />
        Desfazer ({historyLength})
      </button>

      <button
        onClick={onDiscard}
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
        onClick={onSave}
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
);
