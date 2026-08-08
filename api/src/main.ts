import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  // bodyParser: false is required by @thallesp/nestjs-better-auth — the
  // library re-adds json/urlencoded parsers for non-auth routes itself.
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // Everything lives under /api. The auth module auto-excludes its
  // basePath (/api/auth) from this prefix, so auth stays at /api/auth/*.
  // Note: no global ValidationPipe on purpose — DTOs are validated with
  // zod pipes (ZodValidationPipe) at the controller boundary.
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Content Generator API')
      .setDescription(
        'AI-powered viral clip generation. Auth: session cookie via /api/auth/* (better-auth).',
      )
      .setVersion('0.1.0')
      .addCookieAuth('better-auth.session_token')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}/api (docs: /api/docs)`);
}

void bootstrap();

