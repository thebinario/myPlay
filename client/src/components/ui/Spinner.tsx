import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: number;
  color?: string;
}

export const Spinner = ({ size = 24, color = '#A594FF' }: SpinnerProps) => (
  <>
    <style>{'@keyframes midoteca-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }'}</style>
    <Loader2 size={size} color={color} style={{ animation: 'midoteca-spin 1s linear infinite' }} />
  </>
);

Spinner.displayName = 'Spinner';
