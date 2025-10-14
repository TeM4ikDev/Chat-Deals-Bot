import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import { join } from 'path';
import { AppModule } from './app.module';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const PORT = 3030;

  app.enableCors({
    origin: '*',
  })

  app.use(express.json());
  app.setGlobalPrefix('api');

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.use(
    '/public',
    express.static(join(__dirname, '..', 'public')),
  );
  app.use(
    express.static(join(__dirname, '../../client/dist')),
  );

  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      next();
    } else {
      res.sendFile(join(__dirname, '../../client/dist/index.html'));
    }
  });

  process.on('unhandledRejection', (reason) => {
    console.error('❗ Unhandled rejection:', reason);
  });

  await app.listen(PORT, () => {
    console.log(`Nest application is ready on http://localhost:${PORT}`);
  });
}
bootstrap();
