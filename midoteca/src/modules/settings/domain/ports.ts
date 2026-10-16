import type { JsonValue } from '../../../core/json';
import type { AppSetting } from './entities';

export interface SettingsRepository {
  get(key: string): Promise<AppSetting | null>;
  set(key: string, value: JsonValue): Promise<AppSetting>;
  list(): Promise<AppSetting[]>;
  delete(key: string): Promise<void>;
}
