import { describe, expect, it } from 'vitest';
import packageJson from '../../../package.json';
import { APP_CONFIG } from '@/core/config/app.config';

describe('core/config — APP_CONFIG', () => {
  it('exibe a versão publicada no package.json (fonte única da versão)', () => {
    expect(APP_CONFIG.version).toBe(packageJson.version);
  });
});
