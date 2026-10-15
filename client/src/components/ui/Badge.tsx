import { forwardRef, SVGProps } from 'react';

interface BadgeProps extends SVGProps<SVGGElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'violet';
  size?: 'sm' | 'md' | 'lg';
}

export const Badge = forwardRef<SVGGElement, BadgeProps>(({ 
  children, 
  variant = 'default', 
  size = 'md',
  className,
  ...props 
}, ref) => {
  const sizeStyles = {
    sm: { width: '20px', height: '20px', fontSize: '10px' },
    md: { width: '24px', height: '24px', fontSize: '12px' },
    lg: { width: '32px', height: '32px', fontSize: '14px' },
  };

  const variantStyles = {
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

  const styles = {
    ...sizeStyles[size],
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    ...variantStyles[variant],
    ...(className && { className }),
  };

  return (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      style={styles}
      {...props}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        style={{
          ...variantStyles[variant],
          fill: variantStyles[variant].backgroundColor?.includes('rgba')
            ? variantStyles[variant].backgroundColor
            : undefined,
        }}
      />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fill={variantStyles[variant].color}
        fontSize={sizeStyles[size].fontSize}
        fontWeight={600}
      >
        {children}
      </text>
    </svg>
  );
});

Badge.displayName = 'Badge';