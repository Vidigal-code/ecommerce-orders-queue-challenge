import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    abortOnError: false,
  });

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

  function blue(text: string): string {
    return `\x1b[34m${text}\x1b[0m`;
  }

  const logger = new Logger('Bootstrap');
  const shutdown = async (signal: string) => {
    try {
      logger.log(`Received ${signal}. Closing application...`);
      await app.close();
      logger.log('Application closed gracefully.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown', err as any);
      process.exit(1);
    }
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  console.log(
    blue(
      `Server running on http://localhost:${port}  Created by https://github.com/Vidigal-code`,
    ),
  );
}

bootstrap();
