import React from 'react';

/** Tokens visuais do cronograma (mesma paleta escura do app). */
export const STUDY_THEME = {
  card: '#141A2A',
  cardRaised: '#1A2135',
  border: 'rgba(255, 255, 255, 0.07)',
  strong: '#F8FAFC',
  text: '#CBD5E1',
  muted: '#94A3B8',
  faint: '#64748B',
  accent: '#A594FF',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#F87171',
  input: '#0E1220',
} as const;

export const Card: React.FC<
  React.PropsWithChildren<{ style?: React.CSSProperties; label?: string; as?: 'section' | 'div' }>
> = ({ children, style, label, as = 'section' }) =>
  React.createElement(
    as,
    {
      'aria-label': label,
      style: {
        backgroundColor: STUDY_THEME.card,
        border: `1px solid ${STUDY_THEME.border}`,
        borderRadius: '16px',
        padding: '20px',
        boxSizing: 'border-box',
        ...style,
      },
    },
    children,
  );

export const CardTitle: React.FC<React.PropsWithChildren<{ aside?: React.ReactNode }>> = ({
  children,
  aside,
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      marginBottom: '14px',
    }}
  >
    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: STUDY_THEME.strong }}>
      {children}
    </h3>
    {aside}
  </div>
);

export const TrackDot: React.FC<{ color: string; size?: number }> = ({ color, size = 10 }) => (
  <span
    aria-hidden="true"
    style={{
      width: size,
      height: size,
      borderRadius: '999px',
      backgroundColor: color,
      flexShrink: 0,
      display: 'inline-block',
    }}
  />
);

export const fieldStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '9px 11px',
  borderRadius: '9px',
  border: `1px solid ${STUDY_THEME.border}`,
  backgroundColor: STUDY_THEME.input,
  color: STUDY_THEME.strong,
  fontSize: '13px',
  fontFamily: 'inherit',
  colorScheme: 'dark',
};

/** Rótulo + controle; o `htmlFor` liga o texto ao campo para leitores de tela. */
export const Field: React.FC<
  React.PropsWithChildren<{ label: string; htmlFor: string; style?: React.CSSProperties }>
> = ({ label, htmlFor, children, style }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0, ...style }}>
    <label
      htmlFor={htmlFor}
      style={{ fontSize: '12px', fontWeight: 600, color: STUDY_THEME.muted }}
    >
      {label}
    </label>
    {children}
  </div>
);

export const Chip: React.FC<{
  label: string;
  pressed: boolean;
  onClick: () => void;
  color?: string;
}> = ({ label, pressed, onClick, color = STUDY_THEME.accent }) => (
  <button
    type="button"
    aria-pressed={pressed}
    onClick={onClick}
    style={{
      padding: '7px 12px',
      borderRadius: '999px',
      border: `1px solid ${pressed ? color : STUDY_THEME.border}`,
      backgroundColor: pressed ? `${color}26` : 'transparent',
      color: pressed ? STUDY_THEME.strong : STUDY_THEME.text,
      fontSize: '12px',
      fontWeight: 600,
      cursor: 'pointer',
      fontFamily: 'inherit',
    }}
  >
    {label}
  </button>
);

export const ErrorNote: React.FC<{ message: string | null }> = ({ message }) =>
  message ? (
    <p
      role="alert"
      style={{
        margin: '12px 0 0',
        padding: '10px 12px',
        borderRadius: '10px',
        backgroundColor: 'rgba(239, 68, 68, 0.12)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        color: STUDY_THEME.danger,
        fontSize: '13px',
      }}
    >
      {message}
    </p>
  ) : null;
