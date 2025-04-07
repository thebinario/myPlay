import { PartialType } from '@nestjs/mapped-types';
import { CreateVideoDto } from './create-video.dto';

export class UpdateVideoDto extends PartialType(CreateVideoDto) {
  isTranscoded?: boolean;
  transcodedFilePath?: string;
  transcodingProgress?: number;
  lastPosition?: number;
  category?: string;
  alias?: string;
} 