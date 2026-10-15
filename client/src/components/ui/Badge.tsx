import { forwardRef, HTMLAttributes, CSSProperties } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'violet';
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles: Record<NonNullable<BadgeProps['size']>, CSSProperties> = {
  sm: { width: '28px', height: '28px', fontSize: '10px' },
  md: { width: '32px', height: '32px', fontSize: '12px' },
  lg: { width: '40px', height: '40px', fontSize: '14px' },
};

const variantStyles: Record<NonNullable<BadgeProps['variant']>, CSSProperties> = {
  default: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#E2E8F0',
  },
  success: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    color: '#10B981',
  },
  warning: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    color: '#F59F1B',
  },
  error: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: '#F87171',
  },
  violet: {
    backgroundColor: 'rgba(165, 148, 255, 0.2)',
    color: '#A594FF',
  },
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(({
  children,
  variant = 'default',
  size = 'md',
  className,
  style,
  ...props
}, ref) => (
  <span
    ref={ref}
    className={className}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '50%',
      fontWeight: 600,
      flexShrink: 0,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...style,
    }}
    {...props}
  >
    {children}
  </span>
));

Badge.displayName = 'Badge';
