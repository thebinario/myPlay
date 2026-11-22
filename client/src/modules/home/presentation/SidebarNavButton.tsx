import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';

export const SIDEBAR_THEME = {
  background: '#0E1220',
  border: 'rgba(255, 255, 255, 0.06)',
  icon: '#94A3B8',
  text: '#CBD5E1',
  strong: '#F8FAFC',
  muted: '#64748B',
  activeBackground: 'rgba(255, 255, 255, 0.08)',
  hoverBackground: 'rgba(255, 255, 255, 0.04)',
  brand: '#A594FF',
} as const;

/** Distância do item até a borda esquerda da sidebar (onde fica a marca do ativo). */
export const SIDEBAR_GUTTER = 12;

interface SidebarNavButtonProps {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  active?: boolean;
  collapsed?: boolean;
  /** Atalho exibido à direita quando expandida (ex.: "Ctrl K"). */
  shortcut?: string;
}

/**
 * Item da sidebar. Expandida: ícone + nome; recolhida: só o ícone, com o nome
 * no tooltip. O ativo ganha fundo neutro e uma marca branca na borda esquerda.
 */
export const SidebarNavButton: React.FC<SidebarNavButtonProps> = ({
  label,
  icon: Icon,
  onClick,
  active = false,
  collapsed = false,
  shortcut,
}) => {
  const [hovered, setHovered] = useState(false);
  const background = active
    ? SIDEBAR_THEME.activeBackground
    : hovered
      ? SIDEBAR_THEME.hoverBackground
      : 'transparent';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={collapsed ? label : undefined}
      aria-current={active ? 'page' : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        width: collapsed ? '44px' : '100%',
        height: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: '12px',
        padding: collapsed ? 0 : '0 12px',
        boxSizing: 'border-box',
        backgroundColor: background,
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        color: active ? SIDEBAR_THEME.strong : SIDEBAR_THEME.text,
        transition: 'background-color 0.15s ease, color 0.15s ease',
      }}
    >
      {active && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: `-${SIDEBAR_GUTTER}px`,
            top: '12px',
            bottom: '12px',
            width: '3px',
            borderRadius: '0 3px 3px 0',
            backgroundColor: SIDEBAR_THEME.strong,
          }}
        />
      )}
      <Icon
        size={20}
        strokeWidth={1.75}
        color={active ? SIDEBAR_THEME.strong : SIDEBAR_THEME.icon}
        style={{ flexShrink: 0 }}
      />
      {!collapsed && (
        <>
          <span style={{ fontSize: '15px', fontWeight: active ? 600 : 500, whiteSpace: 'nowrap' }}>
            {label}
          </span>
          {shortcut && (
            <kbd
              style={{
                marginLeft: 'auto',
                padding: '2px 6px',
                borderRadius: '5px',
                border: '1px solid rgba(255, 255, 255, 0.14)',
                fontFamily: 'inherit',
                fontSize: '11px',
                fontWeight: 600,
                color: SIDEBAR_THEME.text,
              }}
            >
              {shortcut}
            </kbd>
          )}
        </>
      )}
    </button>
  );
};
