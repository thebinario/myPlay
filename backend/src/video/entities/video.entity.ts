import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class Video {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  alias: string;

  @Column()
  filePath: string;

  @Column({ type: 'bigint', nullable: true })
  fileSize: number;

  @Column({ type: 'float', nullable: true })
  duration: number;

  @Column({ type: 'float', nullable: true })
  lastPosition: number;

  @Column({ default: false })
  isTranscoded: boolean;

  @Column({ nullable: true })
  transcodedFilePath: string;

  @Column({ type: 'float', default: 0 })
  transcodingProgress: number;

  @Column({ nullable: true })
  category: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 