export interface VideoFile {
  name: string;
  path: string;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
}

export interface VideoResponse {
  id: number;
  title: string;
  path: string;
  duration?: number;
  last_position?: number;
  alias?: string;
  added: boolean;
}

export interface ScanDirectoryResponse {
  message: string;
  videos: VideoResponse[];
} 