import type { MidotecaBridge } from '@/core/contracts/desktop-bridge';
import type {
  DuplicateGroupView,
  DuplicatesRepository,
  MediaAnalysisStatusView,
} from '@/modules/library/domain/duplicates';

/** Adapter IPC do read model de duplicatas (`media.listDuplicateGroups`). */
export class IpcDuplicatesRepository implements DuplicatesRepository {
  constructor(private readonly bridge: MidotecaBridge) {}

  async listGroups(): Promise<DuplicateGroupView[]> {
    return this.bridge.invoke('media.listDuplicateGroups', {});
  }

  async analysisStatus(): Promise<MediaAnalysisStatusView> {
    return this.bridge.invoke('media.analysisStatus', {});
  }
}
