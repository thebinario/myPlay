import { nowIso } from '../../../core/clock';
import { decodeJson } from '../../../core/json-codec';
import { assertNonEmptyString } from '../../../core/validation';
import type { JsonValue } from '../../../core/json';
import type { AppSetting } from '../domain/entities';
import type { SettingsRepository } from '../domain/ports';
import type { SqliteDatabase } from '../../../platform/persistence/sqlite/database';
import { mapSqliteError } from '../../../platform/persistence/sqlite/errors';

interface SettingRow {
  key: string;
  value: string;
  updated_at: string;
}

function mapSetting(row: SettingRow): AppSetting {
  return {
    key: row.key,
    value: decodeJson(row.value),
    updatedAt: row.updated_at,
  };
}

export class SqliteSettingsRepository implements SettingsRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async get(key: string): Promise<AppSetting | null> {
    const row = this.db
      .prepare('SELECT key, value, updated_at FROM app_settings WHERE key = ?')
      .get(key) as SettingRow | undefined;
    return row ? mapSetting(row) : null;
  }

  async set(key: string, value: JsonValue): Promise<AppSetting> {
    const normalizedKey = assertNonEmptyString(key, 'key');
    const updatedAt = nowIso();
    try {
      this.db
        .prepare(
          `INSERT INTO app_settings (key, value, updated_at)
           VALUES (?, ?, ?)
           ON CONFLICT(key) DO UPDATE SET
             value = excluded.value,
             updated_at = excluded.updated_at`,
        )
        .run(normalizedKey, JSON.stringify(value ?? null), updatedAt);
    } catch (error) {
      throw mapSqliteError(error, 'setAppSetting');
    }
    const saved = await this.get(normalizedKey);
    if (!saved) throw new Error('AppSetting was not persisted');
    return saved;
  }

  async list(): Promise<AppSetting[]> {
    const rows = this.db
      .prepare('SELECT key, value, updated_at FROM app_settings ORDER BY key')
      .all() as SettingRow[];
    return rows.map(mapSetting);
  }

  async delete(key: string): Promise<void> {
    this.db.prepare('DELETE FROM app_settings WHERE key = ?').run(key);
  }
}
