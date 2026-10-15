import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export const SectionHeader = ({ title, subtitle, className }: SectionHeaderProps) => {
  return (
    <div style={{ className }}>
      <h2 style={{ color: '#F8FAFC', fontSize: '16px', fontWeight: 600, margin: '0 0 4px', letterSpacing: '0.5px' }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{ color: '#64748B', fontSize: '12px', fontWeight: 500, margin: '0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
};

SectionHeader.displayName = 'SectionHeader';