import { useActivity } from '@/modules/activity/presentation/ActivityProvider';
import { ActivityIndicator } from '@/modules/activity/presentation/ActivityIndicator';

/** Container: liga o read model de atividade ao indicador visual. */
export function ActivityCenter() {
  return <ActivityIndicator snapshot={useActivity()} />;
}
