import React from 'react';

interface TooltipProps {
  children: React.ReactNode;
  text: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export const Tooltip = ({ children, text, placement = 'top', delay = 0 }: TooltipProps) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [showTimeout, setShowTimeout] = React.useState<number | null>(null);
  const [hideTimeout, setHideTimeout] = React.useState<number | null>(null);

  const show = () => {
    setShowTimeout(window.setTimeout(() => setIsHovered(true), delay));
  };

  const hide = () => {
    setHideTimeout(window.setTimeout(() => setIsHovered(false), delay));
  };

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      {children}
      {isHovered && (
        <div
          style={{
            position: 'absolute',
            [placement]: 12,
            margin: '8px 0 0',
            padding: '6px 10px',
            backgroundColor: '#141A28',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '6px',
            fontSize: '11px',
            color: '#E2E8F0',
            lineHeight: '1.2',
            zIndex: 100,
            whiteSpace: 'nowrap',
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
};

Tooltip.displayName = 'Tooltip';