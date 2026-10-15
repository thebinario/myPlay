export const APP_CONFIG = {
  API_BASE_URL: 'http://localhost:3000/api',
  VIDEO: {
    STREAM_URL: (id: string) => `${APP_CONFIG.API_BASE_URL}/videos/${id}/stream`,
    TRANSCODE_URL: (id: string) => `${APP_CONFIG.API_BASE_URL}/videos/${id}/transcode`,
    TRANSCODE_PROGRESS_URL: (id: string) =>
      `${APP_CONFIG.API_BASE_URL}/videos/${id}/transcode/progress`,
    TRANSCODE_STATUS_URL: (id: string) =>
      `${APP_CONFIG.API_BASE_URL}/videos/${id}/transcode/status`,
    TRANSCODE_INITIAL_STATUS_URL: (id: string) =>
      `${APP_CONFIG.API_BASE_URL}/videos/${id}/transcode/initial-status`,
    TRANSCODE_INITIAL_SEGMENT_URL: (id: string) =>
      `${APP_CONFIG.API_BASE_URL}/videos/${id}/transcode/initial-segment`,
  },
  VIDEO_DIRECTORY: '/', // Diretório raiz para escanear vídeos
};
