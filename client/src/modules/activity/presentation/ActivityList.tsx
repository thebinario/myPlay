import type { ActivityItemView } from '@/modules/activity/domain/activity';

const INDETERMINATE_KEYFRAMES =
  '@keyframes midoteca-activity-slide { from { transform: translateX(-100%); } to { transform: translateX(250%); } }';

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
          backgroundColor: '#A594FF',
          transition: 'width 0.3s ease',
          animation: known ? undefined : 'midoteca-activity-slide 1.2s ease-in-out infinite',
        }}
      />
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityItemView }) {
  const running = item.status === 'running';
  return (
    <li style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '10px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: running ? '#E2E8F0' : '#94A3B8' }}>
          {item.label}
        </span>
        <span style={{ fontSize: '11px', color: '#94A3B8', whiteSpace: 'nowrap' }}>
          {running ? (item.percent !== null ? `${item.percent}%` : '') : 'Na fila'}
        </span>
      </div>
      {item.detail && (
        <span
          title={item.detail}
          style={{
            fontSize: '11px',
            color: '#64748B',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.detail}
        </span>
      )}
      {running && <ActivityProgress percent={item.percent} label={item.label} />}
    </li>
  );
}

/** Lista das tarefas em segundo plano, na ordem entregue pelo núcleo. */
export function ActivityList({ items }: { items: ActivityItemView[] }) {
  return (
    <>
      <style>{INDETERMINATE_KEYFRAMES}</style>
      <ul
        aria-label="Atividades em segundo plano"
        style={{ listStyle: 'none', margin: 0, padding: 0 }}
      >
        {items.map((item) => (
          <ActivityRow key={item.id} item={item} />
        ))}
      </ul>
    </>
  );
}
