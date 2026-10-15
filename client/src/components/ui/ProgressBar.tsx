interface ProgressBarProps {
  value: number;
  max?: number;
  width?: string;
  height?: string;
  bgColor?: string;
  progressColor?: string;
}

export const ProgressBar = ({
  value,
  max = 100,
  width = '100%',
  height = '6px',
  bgColor = 'rgba(255, 255, 255, 0.15)',
  progressColor = '#A594FF',
}: ProgressBarProps) => {
  const percentage = (value / max) * 100;

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: bgColor,
        borderRadius: '999px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${percentage}%`,
          height,
          backgroundColor: progressColor,
          borderRadius: '999px',
          transition: 'width 0.1s ease',
        }}
      />
    </div>
  );
};

ProgressBar.displayName = 'ProgressBar';
