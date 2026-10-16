import { describe, it, expect } from 'vitest';
import { getPreferences } from '@/modules/settings/application/queries/get-preferences';
import { updatePreference } from '@/modules/settings/application/use-cases/update-preference';
import { normalizePreferences } from '@/modules/settings/domain/preferences';
import { createInMemoryPreferencesRepository } from '@/modules/settings/infrastructure/mock-preferences.repository';

describe('settings/application — preferências', () => {
  it('inicia com os padrões e persiste alterações', () => {
    const repository = createInMemoryPreferencesRepository();
    expect(getPreferences(repository).playbackSpeed).toBe('1');

    updatePreference(repository, 'playbackSpeed', '1.5');
    expect(getPreferences(repository).playbackSpeed).toBe('1.5');
  });

  it('normaliza preferências desconhecidas com os padrões', () => {
    expect(normalizePreferences({ theme: 'light' })).toMatchObject({
      theme: 'light',
      playbackSpeed: '1',
    });
  });
});
