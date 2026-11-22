import React from 'react';
import { APP_CONFIG } from '@/core/config/app.config';
import { SIDEBAR_THEME } from './SidebarNavButton';

interface SidebarAccountProps {
  collapsed: boolean;
  /** O núcleo está processando algo (vem do read model de atividade). */
  syncing: boolean;
  onClick: () => void;
}

/** Rodapé "Minha conta": estado de sincronização da biblioteca e versão do app. */
export const SidebarAccount: React.FC<SidebarAccountProps> = ({ collapsed, syncing, onClick }) => {
  const status = syncing ? 'Atualizando…' : 'Sincronizado';
  const version = `Midoteca v${APP_CONFIG.version}`;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Minha conta — ${status} · ${version}`}
      title={`${status} · ${version}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        padding: collapsed ? 0 : '0 6px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'relative',
          width: '36px',
          height: '36px',
          flexShrink: 0,
          borderRadius: '50%',
          backgroundColor: '#2A3047',
          color: SIDEBAR_THEME.strong,
          fontSize: '14px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        M
        <span
          style={{
            position: 'absolute',
            right: '-1px',
            bottom: '-1px',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: syncing ? '#F59E0B' : '#10B981',
            border: `2px solid ${SIDEBAR_THEME.background}`,
          }}
        />
      </span>
      {!collapsed && (
        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: SIDEBAR_THEME.strong }}>
            Minha conta
          </span>
          <span style={{ fontSize: '12px', color: SIDEBAR_THEME.icon }}>{status}</span>
        </span>
      )}
    </button>
  );
};
