import React from 'react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ElementType;
  size?: number;
  color?: string;
  variant?: 'default' | 'violet' | 'muted';
  children?: React.ReactNode;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(({ 
  icon: IconComponent, 
  size = 18, 
  color = '#94A3B8', 
  variant = 'muted', 
  children, 
  ...props 
}, ref) => {
  const variantStyles = {
    default: {
      backgroundColor: 'rgba(255, 255, 255, 0.06)',
      color,
      borderRadius: '6px',
    },
    violet: {
      backgroundColor: 'rgba(165, 148, 255, 0.15)',
      color: '#A594FF',
      borderRadius: '6px',
    },
    muted: {
      backgroundColor: 'transparent',
      color,
      border: 'none',
    },
  };

  const styles = {
    ...variantStyles[variant],
    padding: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    '&:hover': {
      backgroundColor: variant === 'violet' ? 'rgba(165, 148, 255, 0.25)' : variant === 'default' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
    },
  };

  return (
    <button
      ref={ref}
      style={styles}
      {...props}
    >
      <IconComponent size={size} color={color} />
      {children}
    </button>
  );
});

IconButton.displayName = 'IconButton';