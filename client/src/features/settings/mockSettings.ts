export type LibrarySource = { id: string; path: string; status: 'connected' | 'disconnected'; itemCount: number };
export type AppPreferences = { speed: string; subtitles: string; resume: boolean; autoNext: boolean; theme: string; language: string; indexing: boolean; saveBattery: boolean };
export const INITIAL_SOURCES: LibrarySource[] = [
  { id: 'demo-courses', path: 'D:\\Cursos', status: 'connected', itemCount: 42 },
  { id: 'demo-movies', path: 'E:\\Filmes', status: 'connected', itemCount: 18 },
];
export const DEFAULT_PREFERENCES: AppPreferences = {
  speed: '1', subtitles: 'pt-BR', resume: true, autoNext: false,
  theme: 'dark', language: 'pt-BR', indexing: true, saveBattery: true,
};
