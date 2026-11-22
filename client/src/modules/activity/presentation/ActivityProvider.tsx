import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import {
  IDLE_ACTIVITY,
  type ActivityRepository,
  type ActivitySnapshotView,
} from '@/modules/activity/domain/activity';

const ActivityContext = createContext<ActivityRepository | null>(null);
const noopSubscribe = () => () => {};
const idle = () => IDLE_ACTIVITY;

/** Seam de DI da atividade. Sem repositório (web/Storybook), fica sempre ocioso. */
export function ActivityProvider({
  repository,
  children,
}: {
  repository?: ActivityRepository;
  children: ReactNode;
}) {
  return <ActivityContext.Provider value={repository ?? null}>{children}</ActivityContext.Provider>;
}

export function useActivity(): ActivitySnapshotView {
  const repository = useContext(ActivityContext);
  return useSyncExternalStore(
    repository ? (listener) => repository.subscribe(listener) : noopSubscribe,
    repository ? () => repository.getSnapshot() : idle,
    repository ? () => repository.getSnapshot() : idle,
  );
}
