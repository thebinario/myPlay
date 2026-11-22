import { describe, expect, it } from 'vitest';
import { createRef } from 'react';
import { renderHook } from '@testing-library/react';
import { useMediaElementPlayback } from '@/modules/player/presentation/hooks/useMediaElementPlayback';

const src = 'midoteca-media://media/%2FHD%2Faula.webm';

describe('useMediaElementPlayback — veredito do núcleo', () => {
  it('abre direto no diagnóstico de arquivo danificado, sem tentar reproduzir', () => {
    const { result } = renderHook(() =>
      useMediaElementPlayback({
        videoRef: createRef<HTMLVideoElement>(),
        src,
        playability: 'damaged',
        playabilityReason: 'Invalid data found when processing input',
      }),
    );
    expect(result.current.status).toBe('error');
    expect(result.current.errorInfo).toMatchObject({
      kind: 'corrupted',
      title: 'Arquivo de vídeo danificado ou incompleto',
    });
  });

  it('informa o codec incompatível detectado pelo núcleo', () => {
    const { result } = renderHook(() =>
      useMediaElementPlayback({
        videoRef: createRef<HTMLVideoElement>(),
        src,
        playability: 'unsupported',
        playabilityReason: 'codec de vídeo hevc',
      }),
    );
    expect(result.current.status).toBe('error');
    expect(result.current.errorInfo?.message).toContain('codec de vídeo hevc');
  });

  it('reproduz normalmente quando o núcleo considera o arquivo reproduzível', () => {
    const { result } = renderHook(() =>
      useMediaElementPlayback({
        videoRef: createRef<HTMLVideoElement>(),
        src,
        playability: 'playable',
      }),
    );
    expect(result.current.status).toBe('ready');
    expect(result.current.errorInfo).toBeNull();
  });
});
