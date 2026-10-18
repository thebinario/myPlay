/**
 * Tipos e regras puras de classificação de erros de reprodução de vídeo.
 */

export type PlaybackErrorKind = 'unsupported_format' | 'corrupted' | 'missing' | 'unknown';

export interface PlaybackErrorInfo {
  kind: PlaybackErrorKind;
  format: string;
  title: string;
  message: string;
  suggestion?: string;
  filename?: string;
}

const NATIVELY_SUPPORTED_EXTENSIONS = new Set(['.mp4', '.webm', '.m4v', '.ogv']);

const KNOWN_UNSUPPORTED_EXTENSIONS = new Set([
  '.mkv',
  '.avi',
  '.wmv',
  '.flv',
  '.rmvb',
  '.mov',
  '.ts',
  '.vob',
  '.mpg',
  '.mpeg',
]);

/**
 * Extrai a extensão/formato de uma URL ou caminho de arquivo.
 */
export function extractFileFormat(urlOrPath: string): string {
  if (!urlOrPath) return 'DESCONHECIDO';

  try {
    // Remove query params e hash se presentes
    const cleanPath = urlOrPath.split('?')[0].split('#')[0];
    const decoded = decodeURIComponent(cleanPath);
    // Separa por barra ou barra invertida
    const segments = decoded.split(/[/\\]/);
    const lastSegment = segments[segments.length - 1];
    const dotIndex = lastSegment.lastIndexOf('.');
    if (dotIndex > 0 && dotIndex < lastSegment.length - 1) {
      return lastSegment.slice(dotIndex + 1).toUpperCase();
    }
  } catch {
    /* fallback simples */
  }

  const match = /\.([a-zA-Z0-9]+)(?:[?#]|$)/.exec(urlOrPath);
  return match ? match[1].toUpperCase() : 'DESCONHECIDO';
}

/**
 * Retorna se o formato/extensão é suportado nativamente pelo elemento HTML5 video.
 */
export function isFormatNativelySupported(formatOrExt: string): boolean {
  if (!formatOrExt) return false;
  const normalized = formatOrExt.startsWith('.')
    ? formatOrExt.toLowerCase()
    : `.${formatOrExt.toLowerCase()}`;
  return NATIVELY_SUPPORTED_EXTENSIONS.has(normalized);
}

export interface ClassifyPlaybackErrorInput {
  url?: string;
  mediaErrorCode?: number | null;
  mediaErrorMessage?: string | null;
  isUnavailable?: boolean;
  httpStatus?: number | null;
}

/**
 * Classifica a causa raiz do erro de reprodução de acordo com as evidências disponíveis.
 */
export function classifyPlaybackError(input: ClassifyPlaybackErrorInput): PlaybackErrorInfo {
  const { url = '', mediaErrorCode, mediaErrorMessage, isUnavailable, httpStatus } = input;
  const format = extractFileFormat(url);
  const normalizedExt = `.${format.toLowerCase()}`;

  // 1. Arquivo indisponível ou HD desconectado (marcado explicitamente ou 404/rede)
  if (isUnavailable || httpStatus === 404 || httpStatus === 403 || mediaErrorCode === 2) {
    return {
      kind: 'missing',
      format,
      title: 'Arquivo indisponível ou HD desconectado',
      message:
        'O arquivo da aula não foi localizado no diretório de origem. Verifique se o pendrive ou HD externo está conectado.',
      suggestion: 'Reconecte a unidade externa ou sincronize a pasta na aba Bibliotecas.',
    };
  }

  // 2. Arquivo corrompido ou erro de decodificação de stream
  const isDecodeError =
    mediaErrorCode === 3 ||
    (mediaErrorMessage && /decode|corrupt|truncate|demux/i.test(mediaErrorMessage));

  if (isDecodeError) {
    return {
      kind: 'corrupted',
      format,
      title: 'Arquivo corrompido ou danificado',
      message:
        'Ocorreu uma falha ao decodificar os dados do vídeo. O arquivo pode estar corrompido, incompleto ou danificado durante a transferência.',
      suggestion:
        'Verifique se o arquivo original abre em outros players ou tente copiar novamente o arquivo.',
    };
  }

  // 3. Formato não suportado nativamente pelo Chromium
  const isKnownUnsupported = KNOWN_UNSUPPORTED_EXTENSIONS.has(normalizedExt);
  const isNotSupportedCode = mediaErrorCode === 4;

  if (isKnownUnsupported || (isNotSupportedCode && httpStatus !== 404)) {
    return {
      kind: 'unsupported_format',
      format,
      title: 'Formato de vídeo não suportado',
      message: `O formato .${format.toLowerCase()} ou o codec deste vídeo não é compatível nativamente com o reprodutor.`,
      suggestion: 'Recomendamos converter o arquivo para MP4 (H.264/AAC) ou WebM para assistir.',
    };
  }

  // 4. Erro genérico
  return {
    kind: 'unknown',
    format,
    title: 'Erro na reprodução do vídeo',
    message: 'Não foi possível reproduzir este vídeo.',
    suggestion: 'Verifique se o arquivo está acessível e tente novamente.',
  };
}
