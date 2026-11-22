import type { Cue } from '../../core/domain/subtitles';
import type { Transcriber } from '../../modules/media/domain/transcription';
import { localModelOptions, type LocalModelOptions } from './local-models';

interface AsrChunk {
  timestamp: [number, number | null];
  text: string;
}

type AsrPipeline = (
  audio: Float32Array,
  options: { return_timestamps: boolean; language: string; task: string },
) => Promise<{ text: string; chunks?: AsrChunk[] }>;

export const WHISPER_MODEL = 'onnx-community/whisper-base';

/**
 * Local speech-to-text with Whisper (transformers.js + onnxruntime-node). The
 * model is downloaded on first use into the app data folder and then works
 * offline. ONNX inference runs on native threads; only feature extraction
 * touches the JS thread, once per 30 s window.
 */
export class WhisperTranscriber implements Transcriber {
  readonly modelId = WHISPER_MODEL;
  private pipeline: Promise<AsrPipeline> | null = null;

  constructor(private readonly options: LocalModelOptions) {}

  async transcribe(audio: Float32Array, { language }: { language: string }): Promise<Cue[]> {
    if (audio.length === 0) return [];
    const asr = await this.load();
    const output = await asr(audio, { return_timestamps: true, language, task: 'transcribe' });
    const durationMs = Math.round((audio.length / 16_000) * 1000);
    const chunks = output.chunks?.length
      ? output.chunks
      : [{ timestamp: [0, durationMs / 1000] as [number, number], text: output.text }];
    return chunks.map((chunk) => ({
      startMs: Math.round(chunk.timestamp[0] * 1000),
      endMs: Math.round((chunk.timestamp[1] ?? durationMs / 1000) * 1000),
      text: chunk.text,
    }));
  }

  private load(): Promise<AsrPipeline> {
    this.pipeline ??= (async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { pipeline } = require('@huggingface/transformers') as {
        pipeline: (task: string, model: string, options: object) => Promise<AsrPipeline>;
      };
      return pipeline(
        'automatic-speech-recognition',
        WHISPER_MODEL,
        localModelOptions(this.options, WHISPER_MODEL, 'q8'),
      );
    })();
    this.pipeline.catch(() => {
      this.pipeline = null;
    });
    return this.pipeline;
  }
}
