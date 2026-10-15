import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Resolves the per-user application data directory that hosts the local SQLite
 * database. The catalog deliberately lives in user data (never on the external
 * drive being cataloged), so disconnecting a drive cannot corrupt history, and
 * no absolute path is hardcoded.
 *
 * An explicit `MIDOTECA_DATA_DIR` env var always wins, which keeps tests and
 * portable installs hermetic.
 */
export function resolveAppDataDir(): string {
  const override = process.env.MIDOTECA_DATA_DIR?.trim();
  if (override && override.length > 0) return override;

  const home = homedir();
  switch (process.platform) {
    case 'darwin':
      return join(home, 'Library', 'Application Support', 'Midoteca');
    case 'win32': {
      const appData = process.env.APPDATA?.trim();
      return appData && appData.length > 0
        ? join(appData, 'Midoteca')
        : join(home, 'AppData', 'Roaming', 'Midoteca');
    }
    default: {
      const xdg = process.env.XDG_DATA_HOME?.trim();
      return xdg && xdg.length > 0
        ? join(xdg, 'midoteca')
        : join(home, '.local', 'share', 'midoteca');
    }
  }
}

export function resolveDefaultDatabasePath(): string {
  return join(resolveAppDataDir(), 'midoteca.db');
}
