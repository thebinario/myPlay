import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: 'default' | 'secondary' | 'ghost' | 'violet' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'default', size = 'md', asChild = false, className, ...props }, ref) => {
    const sizeStyles = {
      sm: { padding: '6px 12px', fontSize: '11px', borderRadius: '6px' },
      md: { padding: '8px 16px', fontSize: '13px', borderRadius: '8px' },
      lg: { padding: '10px 20px', fontSize: '14px', borderRadius: '10px' },
    };

    const variantStyles = {
      default: {
        backgroundColor: '#A594FF',
        color: '#0D111B',
        '&:hover': { backgroundColor: '#6E54FF' },
      },
      secondary: {
        backgroundColor: 'transparent',
        color: '#F8FAFC',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
      },
      ghost: {
        backgroundColor: 'transparent',
        color: '#94A3B8',
        '&:hover': { color: '#FFFFFF' },
      },
      violet: {
        backgroundColor: '#A594FF',
        color: '#0D111B',
        '&:hover': { backgroundColor: '#6E54FF' },
      },
      danger: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        color: '#F87171',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.3)' },
      },
    };

    const baseStyles = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      border: 'none',
      whiteSpace: 'nowrap',
      ...sizeStyles[size],
    };

    const styles = {
      ...baseStyles,
      ...variantStyles[variant],
    };

    if (asChild) {
      return <>{children}</>;
    }

    return (
      <button ref={ref} style={styles} className={className} {...props}>
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
