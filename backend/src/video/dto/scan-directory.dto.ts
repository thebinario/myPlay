import { IsOptional, IsString } from 'class-validator';

export class ScanDirectoryDto {
  @IsOptional()
  @IsString()
  path?: string;
} 