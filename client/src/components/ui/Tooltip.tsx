import { useEffect, useRef, useState, ReactNode } from 'react';

interface TooltipProps {
  children: ReactNode;
  text: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export const Tooltip = ({ children, text, placement = 'top', delay = 0 }: TooltipProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const showTimeout = useRef<number | null>(null);
  const hideTimeout = useRef<number | null>(null);

  const show = () => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
      hideTimeout.current = null;
    }
    showTimeout.current = window.setTimeout(() => setIsHovered(true), delay);
  };

  const hide = () => {
    if (showTimeout.current) {
      clearTimeout(showTimeout.current);
      showTimeout.current = null;
    }
    hideTimeout.current = window.setTimeout(() => setIsHovered(false), delay);
  };

  useEffect(() => {
    return () => {
      if (showTimeout.current) clearTimeout(showTimeout.current);
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
    };
  }, []);

  return (
    <div
      onMouseEnter={show}
      onMouseLeave={hide}
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
