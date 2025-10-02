import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { abortOnError: false });

  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Servidor iniciado em http://localhost:${port}`);
  logger.log(`Metrics: http://localhost:${port}/metrics (se habilitado)`);
  logger.log(`Health:   http://localhost:${port}/health/ready`);
  logger.log(`Author:   https://github.com/Vidigal-code`);

  const shutdown = async (signal: string) => {
    try {
      logger.warn(`Recebido ${signal}. Encerrando...`);
      await app.close();
      logger.log('Aplicação encerrada.');
      process.exit(0);
    } catch (err) {
      logger.error('Erro no encerramento', err as any);
      process.exit(1);
    }
  };
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}
bootstrap().catch((err) => {
  const logger = new Logger('Bootstrap');
  logger.error('Erro ao iniciar aplicação', err as Error);
  process.exit(1);
});
