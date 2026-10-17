import type React from 'react';

export const libraryCourseContentsStyles: Record<string, React.CSSProperties> = {
  contents: { display: 'flex', flexDirection: 'column', gap: 16 },
  section: {
    overflow: 'hidden',
    backgroundColor: '#141A28',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
  },
  module: { margin: 0, borderTop: '1px solid rgba(255,255,255,0.06)' },
  moduleHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '16px 20px',
    color: '#A594FF',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    listStyle: 'none',
  },
  moduleCount: { marginLeft: 'auto', color: '#94A3B8', fontSize: 13, fontWeight: 400 },
};
