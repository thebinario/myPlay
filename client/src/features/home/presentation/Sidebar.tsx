import React from 'react';
import { Badge } from '@/shared/ui/Badge';
import { IconButton } from '@/shared/ui/IconButton';
import { Home, Library, Search, Settings, BookOpen } from 'lucide-react';
import { NavigationTab } from '@/core/domain/library';

interface SidebarProps {
  currentTab: NavigationTab;
  onNavigate: (tab: NavigationTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onNavigate }) => {
  const navItems = [
    { id: 'home' as NavigationTab, label: 'Início', icon: Home },
    { id: 'library' as NavigationTab, label: 'Biblioteca', icon: Library },
    { id: 'search' as NavigationTab, label: 'Pesquisa', icon: Search },
    { id: 'settings' as NavigationTab, label: 'Configurações', icon: Settings },
  ];

  return (
    <aside
      aria-label="Barra lateral de navegação"
      style={{
        width: '76px',
        backgroundColor: '#121622',
        borderRight: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px 0',
        zIndex: 50,
        flexShrink: 0,
        height: '100vh',
      }}
    >
      {/* Brand logo compact */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '32px',
          cursor: 'pointer',
        }}
        onClick={() => onNavigate('home')}
        title="MIDOTECA"
      >
        <Badge variant="violet" size="sm" style={{ backgroundColor: '#A594FF' }}>
          <BookOpen size={18} color="#0D111B" strokeWidth={2.5} />
        </Badge>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '1px',
            color: '#A594FF',
            textTransform: 'uppercase',
          }}
        >
          MIDOTECA
        </span>
      </div>

      {/* Navigation Buttons */}
      <nav
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          width: '100%',
          alignItems: 'center',
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentTab === item.id || (item.id === 'library' && currentTab === 'course-details');

          return (
            <IconButton
              key={item.id}
              icon={Icon}
              size={20}
              color={isActive ? '#A594FF' : '#94A3B8'}
              onClick={() => onNavigate(item.id)}
              aria-label={item.label}
              variant={isActive ? 'violet' : 'muted'}
              style={{
                flexDirection: 'column',
                gap: '3px',
                width: '64px',
                padding: '8px 0',
                boxSizing: 'border-box',
              }}
            >
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: isActive ? 600 : 500,
                  letterSpacing: '0.2px',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {item.label}
              </span>
            </IconButton>
          );
        })}
      </nav>

      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#10B981',
            boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)',
          }}
          title="Modo offline pronto"
        />
      </div>
    </aside>
  );
};
