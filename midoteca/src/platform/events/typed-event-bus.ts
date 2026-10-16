import type {
  EventBus,
  LibraryEvent,
  LibraryEventHandler,
  LibraryEventPayloads,
} from '../../modules/indexing/domain/events';

/**
 * Minimal synchronous in-process event bus. Listeners are isolated: a throwing
 * handler never prevents other listeners (or the emitting operation) from
 * proceeding.
 */
export class TypedEventBus implements EventBus {
  private readonly listeners = new Map<LibraryEvent, Set<(payload: unknown) => void>>();

  emit<K extends LibraryEvent>(type: K, payload: LibraryEventPayloads[K]): void {
    const handlers = this.listeners.get(type);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch {
        // Listener errors are contained by design.
      }
    }
  }

  on<K extends LibraryEvent>(type: K, handler: LibraryEventHandler<K>): () => void {
    let handlers = this.listeners.get(type);
    if (!handlers) {
      handlers = new Set();
      this.listeners.set(type, handlers);
    }
    const wrapped = handler as (payload: unknown) => void;
    handlers.add(wrapped);
    return () => {
      handlers?.delete(wrapped);
    };
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}
