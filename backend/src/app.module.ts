import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { dataSourceOptions } from './database/data-source';
import { SurveysModule } from './surveys/surveys.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...dataSourceOptions,
      // Apply any pending migrations on start-up so a fresh database is ready to use.
      migrationsRun: process.env.DB_MIGRATIONS_RUN !== 'false',
    }),
    SurveysModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}