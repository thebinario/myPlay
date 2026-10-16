import { describe, it, expect } from 'vitest';
import { addSource } from '@/modules/sources/application/use-cases/add-source';
import { removeSource } from '@/modules/sources/application/use-cases/remove-source';
import {
  disconnectSource,
  reconnectSource,
} from '@/modules/sources/application/use-cases/reconnect-source';
import { recordSourceScan } from '@/modules/sources/application/use-cases/record-source-scan';
import { checkSourceAvailability } from '@/modules/sources/application/use-cases/check-source-availability';
import { createInMemorySourcesRepository } from '@/modules/sources/infrastructure/mock/mock-library-sources.repository';

function setup() {
  const repository = createInMemorySourcesRepository([]);
  return { repository, deps: { repository } };
}

describe('sources/application — casos de uso', () => {
  it('adiciona uma fonte válida e rejeita caminho vazio', () => {
    const { repository, deps } = setup();
    expect(addSource(deps, { path: '   ' })).toEqual({ ok: false, error: 'invalid' });

    const result = addSource(deps, { path: 'D:/Cursos' });
    expect(result.ok).toBe(true);
    expect(repository.list()).toHaveLength(1);
  });

  it('rejeita fonte duplicada sem criar registro extra', () => {
    const { repository, deps } = setup();
    addSource(deps, { path: 'D:/Cursos' });
    const duplicate = addSource(deps, { path: 'd:/cursos/' });
    expect(duplicate).toEqual({ ok: false, error: 'duplicate' });
    expect(repository.list()).toHaveLength(1);
  });

  it('retira a fonte do catálogo sem tocar em arquivos', () => {
    const { repository, deps } = setup();
    const created = addSource(deps, { path: 'D:/Filmes' });
    const id = created.ok ? created.source.id : '';

    removeSource(deps, id);
    expect(repository.list()).toHaveLength(0);
  });

  it('desconecta e reconecta preservando o histórico conhecido', () => {
    const { repository, deps } = setup();
    const created = addSource(deps, { path: 'D:/Filmes' });
    const id = created.ok ? created.source.id : '';
    recordSourceScan(deps, id, 12, '2026-01-01T00:00:00.000Z');

    disconnectSource(deps, id);
    const disconnected = repository.getById(id);
    expect(disconnected?.status).toBe('disconnected');
    expect(disconnected?.itemCount).toBe(12);
    expect(repository.list()).toHaveLength(1);

    reconnectSource(deps, id);
    expect(repository.getById(id)?.status).toBe('connected');
    expect(repository.getById(id)?.itemCount).toBe(12);
  });

  it('verifica disponibilidade e mantém a fonte desconectada no catálogo', async () => {
    const { repository, deps } = setup();
    const created = addSource(deps, { path: 'D:/Filmes' });
    const id = created.ok ? created.source.id : '';
    disconnectSource(deps, id);

    await checkSourceAvailability(deps, id);

    expect(repository.getById(id)?.status).toBe('disconnected');
    expect(repository.list()).toHaveLength(1);
  });
});
