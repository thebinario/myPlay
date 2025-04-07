import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Video {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  path: string;

  @Column({ type: 'float', default: 0 })
  last_position: number;

  @Column({ type: 'float', default: 0 })
  duration: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
} 