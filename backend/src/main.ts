import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers, cookies, CORS, input cleaning and validation (see app.setup.ts)
  configureApp(app);

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('Survey Management System API')
    .setDescription('API documentation for the Survey Management System')
    .setVersion('1.0')
    .addCookieAuth('sms_session')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
