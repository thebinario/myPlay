import type { SettingsRepository } from '../../settings/domain/ports';
import {
  DEFAULT_TRANSCRIPTION_LANGUAGE,
  type TranscriptStore,
  type TranscriptionStatus,
} from '../domain/transcription';

export const AI_ENABLED_SETTING = 'ai.enabled';
export const TRANSCRIPTION_LANGUAGE_SETTING = 'ai.transcription.language';

/** Settings and status of local transcription (no configuration required). */
export class TranscriptionService {
  constructor(
    private readonly store: TranscriptStore,
    private readonly settings: SettingsRepository,
  ) {}

  /** Local AI is on by default; the person may turn it off in Settings. */
  async isEnabled(): Promise<boolean> {
    const setting = await this.settings.get(AI_ENABLED_SETTING);
    return setting?.value !== false;
  }

  async language(): Promise<string> {
    const setting = await this.settings.get(TRANSCRIPTION_LANGUAGE_SETTING);
    return typeof setting?.value === 'string' && setting.value
      ? setting.value
      : DEFAULT_TRANSCRIPTION_LANGUAGE;
  }

  status(): Promise<TranscriptionStatus> {
    return this.store.status();
  }
}
