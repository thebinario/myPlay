import { Check, Clock, RefreshCw, X, type LucideIcon } from 'lucide-react';
import type { ActivityItemView } from '@/modules/activity/domain/activity';
import { formatRelativeTime } from '@/modules/activity/presentation/relative-time';

export const ACTIVITY_KEYFRAMES = `
@keyframes midoteca-activity-spin { to { transform: rotate(360deg); } }
@keyframes midoteca-activity-slide { from { transform: translateX(-100%); } to { transform: translateX(250%); } }
`;

const STATUS_VIEW: Record<
  ActivityItemView['status'],
  { icon: LucideIcon; color: string; text: string }
> = {
  running: { icon: RefreshCw, color: '#E2E8F0', text: 'Em andamento' },
  queued: { icon: Clock, color: '#64748B', text: 'Na fila' },
  completed: { icon: Check, color: '#34D399', text: 'Concluído' },
  failed: { icon: X, color: '#F87171', text: 'Falhou' },
};

function subtitle(item: ActivityItemView, now: number): string {
  const { text } = STATUS_VIEW[item.status];
  if (item.status === 'running') return item.percent !== null ? `${text} · ${item.percent}%` : text;
  if (item.finishedAt) {
    const when = formatRelativeTime(item.finishedAt, now);
    return when ? `${text} · ${when}` : text;
  }
  return text;
}

function ActivityProgress({ percent, label }: { percent: number | null; label: string }) {
  const known = percent !== null;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={known ? percent : undefined}
      style={{
        height: '4px',
        marginTop: '8px',
        borderRadius: '999px',
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
      }}
    >
      <div
        style={{
          height: '100%',
          width: known ? `${percent}%` : '40%',
          borderRadius: '999px',
          backgroundColor: '#F1F5F9',
          transition: 'width 0.3s ease',
          animation: known ? undefined : 'midoteca-activity-slide 1.2s ease-in-out infinite',
        }}
      />
    </div>
  );
}

function ActivityRow({ item, now }: { item: ActivityItemView; now: number }) {
  const { icon: Icon, color } = STATUS_VIEW[item.status];
  const running = item.status === 'running';
  return (
    <li style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '8px 0' }}>
      <span
        aria-hidden="true"
        style={{
          width: '32px',
          height: '32px',
          flexShrink: 0,
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color,
        }}
      >
        <Icon
          size={15}
          strokeWidth={2}
          style={running ? { animation: 'midoteca-activity-spin 1.4s linear infinite' } : undefined}
        />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          title={item.detail ?? item.label}
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#F1F5F9',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.label}
        </div>
        <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
          {subtitle(item, now)}
        </div>
        {running && <ActivityProgress percent={item.percent} label={item.label} />}
      </div>
    </li>
  );
}

/** Processos na ordem entregue pelo núcleo: em andamento, fila e encerrados recentes. */
export function ActivityList({ items, now }: { items: ActivityItemView[]; now: number }) {
  return (
    <ul aria-label="Processos" style={{ listStyle: 'none', margin: 0, padding: '4px 16px 8px' }}>
      {items.map((item) => (
        <ActivityRow key={item.id} item={item} now={now} />
      ))}
    </ul>
  );
}
