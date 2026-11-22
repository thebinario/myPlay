import type { MidotecaBridge } from '@/core/contracts/desktop-bridge';
import type {
  ContentHitView,
  ContentSearchRepository,
} from '@/modules/search/domain/content-search';

/** Adapter IPC da busca no conteúdo (`search.content`, FTS5 no núcleo). */
export class IpcContentSearchRepository implements ContentSearchRepository {
  constructor(private readonly bridge: MidotecaBridge) {}

  search(text: string): Promise<ContentHitView[]> {
    return this.bridge.invoke('search.content', { text, limit: 20 });
  }
}
