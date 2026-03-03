import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:8081'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Validation globale
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('BloodLink API')
    .setDescription(
      'API de mise en relation entre patients et donneurs de sang',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentification')
    .addTag('users', 'Gestion des utilisateurs')
    .addTag('blood-requests', 'Gestion des demandes de sang')
    .addTag('donations', 'Gestion des donations')
    .addTag('centers', 'Gestion des centres de collecte')
    .addTag('matching', 'Algorithme de matching')
    .addTag('notifications', 'Notifications')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🩸 BloodLink API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
}
bootstrap();