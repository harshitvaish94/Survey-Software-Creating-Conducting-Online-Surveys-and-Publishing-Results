import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Parse the HTTP-only session cookie (SMS-14)
  app.use(cookieParser());

  // Enable CORS for frontend access with credentials
  const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

  app.enableCors({
    origin: [
      frontendOrigin,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://10.249.140.189:5173',
    ],
    credentials: true,
  });

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('Survey Management System API')
    .setDescription('API documentation for the Survey Management System')
    .setVersion('1.0')
    .addCookieAuth('sms_session')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Listen on all network interfaces
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}

bootstrap();