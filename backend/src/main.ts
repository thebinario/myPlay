import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  // Carrega as variáveis de ambiente do arquivo .env
  dotenv.config();

  const app = await NestFactory.create(AppModule);
  
  // Adiciona validação global de DTOs
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));
  
  // Adiciona prefixo global '/api' para todas as rotas
  app.setGlobalPrefix('api');
  
  // Habilita CORS com configuração mais permissiva
  app.enableCors({
    origin: true, // Permite qualquer origem durante desenvolvimento
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  
  // Usa a porta definida no .env ou 3000 como fallback
  const port = process.env.PORT || 3000;
  
  await app.listen(port);
  console.log(`Aplicação rodando na porta ${port}`);
}
bootstrap();