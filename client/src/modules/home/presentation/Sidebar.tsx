import React from 'react';
import { BookOpen, Clock3, House, Library, PanelLeft, Search, Settings } from 'lucide-react';
import { NavigationTab } from '@/core/domain/library';
import { SidebarAccount } from './SidebarAccount';
import { SIDEBAR_GUTTER, SIDEBAR_THEME, SidebarNavButton } from './SidebarNavButton';

interface SidebarProps {
  currentTab: NavigationTab;
  onNavigate: (tab: NavigationTab) => void;
  /** Só ícones (com tooltip) quando true. */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  /** O núcleo está processando algo em segundo plano. */
  syncing?: boolean;
}

export const SIDEBAR_WIDTH = { expanded: 232, collapsed: 72 } as const;

const MAIN_ITEMS = [
  { id: 'home', label: 'Início', icon: House },
  { id: 'library', label: 'Biblioteca', icon: Library },
  { id: 'study', label: 'Estudos', icon: Clock3 },
  { id: 'search', label: 'Pesquisa', icon: Search, shortcut: 'Ctrl K' },
] as const;

function isActive(item: NavigationTab, current: NavigationTab): boolean {
  return current === item || (item === 'library' && current === 'course-details');
}

const Brand: React.FC<{ collapsed: boolean; onClick: () => void }> = ({ collapsed, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Midoteca — página inicial"
    title={collapsed ? 'Midoteca' : undefined}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '0 6px',
      marginBottom: '28px',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      alignSelf: collapsed ? 'center' : 'flex-start',
    }}
  >
    <span
      aria-hidden="true"
      style={{
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        backgroundColor: SIDEBAR_THEME.brand,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <BookOpen size={20} strokeWidth={2} color={SIDEBAR_THEME.background} />
    </span>
    {!collapsed && (
      <span style={{ fontSize: '19px', fontWeight: 700, color: SIDEBAR_THEME.strong }}>
        Midoteca
      </span>
    )}
  </button>
);

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onNavigate,
  collapsed = false,
  onToggleCollapsed,
  syncing = false,
}) => (
  <aside
    aria-label="Barra lateral de navegação"
    style={{
      width: `${collapsed ? SIDEBAR_WIDTH.collapsed : SIDEBAR_WIDTH.expanded}px`,
      backgroundColor: SIDEBAR_THEME.background,
      borderRight: `1px solid ${SIDEBAR_THEME.border}`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: collapsed ? 'center' : 'stretch',
      padding: `22px ${SIDEBAR_GUTTER}px 20px`,
      boxSizing: 'border-box',
      zIndex: 50,
      flexShrink: 0,
      height: '100vh',
      transition: 'width 0.18s ease',
    }}
  >
    <Brand collapsed={collapsed} onClick={() => onNavigate('home')} />

    <nav
      aria-label="Navegação principal"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: collapsed ? 'center' : 'stretch',
        gap: '4px',
      }}
    >
      {MAIN_ITEMS.map((item) => (
        <SidebarNavButton
          key={item.id}
          label={item.label}
          icon={item.icon}
          shortcut={'shortcut' in item ? item.shortcut : undefined}
          collapsed={collapsed}
          active={isActive(item.id, currentTab)}
          onClick={() => onNavigate(item.id)}
        />
      ))}
    </nav>

    <div
      style={{
        marginTop: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: collapsed ? 'center' : 'stretch',
        gap: '6px',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          height: '1px',
          width: '100%',
          backgroundColor: SIDEBAR_THEME.border,
          marginBottom: '12px',
        }}
      />
      <SidebarNavButton
        label="Configurações"
        icon={Settings}
        collapsed={collapsed}
        active={isActive('settings', currentTab)}
        onClick={() => onNavigate('settings')}
      />
      <SidebarNavButton
        label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        icon={PanelLeft}
        collapsed={collapsed}
        onClick={() => onToggleCollapsed?.()}
      />
      <div style={{ marginTop: '14px', width: '100%' }}>
        <SidebarAccount
          collapsed={collapsed}
          syncing={syncing}
          onClick={() => onNavigate('settings')}
        />
      </div>
    </div>
  </aside>
);
