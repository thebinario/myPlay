import type { JsonValue } from '../../../core/json';

/** Simple key/value store for user preferences and app-level flags. */
export interface AppSetting {
  key: string;
  value: JsonValue;
  updatedAt: string;
}
