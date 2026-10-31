import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Survey } from './surveys/survey.entity';
import { SurveysModule } from './surveys/surveys.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      username: process.env.DB_USER || 'sms',
      password: process.env.DB_PASSWORD || 'sms_password',
      database: process.env.DB_NAME || 'sms_db',
      entities: [Survey],
      synchronize: true,
    }),
    SurveysModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}