import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VideoModule } from './video/video.module';
import { typeOrmConfig } from './config/typeorm.config';

@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmConfig),
    VideoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
