export class CreateVideoDto {
  title: string;
  filePath: string;
  isTranscoded?: boolean;
  transcodedFilePath?: string;
  transcodingProgress?: number;
  fileSize?: number;
  duration?: number;
  lastPosition?: number;
  category?: string;
  alias?: string;
} 