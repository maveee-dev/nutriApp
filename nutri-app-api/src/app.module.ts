import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ProfilesModule } from './profiles/profiles.module.js';
import { ConditionsModule } from './conditions/conditions.module.js';
import appConfig from './common/config/app.config.js';
import authConfig from './common/config/auth.config.js';
import databaseConfig from './common/config/database.config.js';
import { envSchema } from './common/config/env.schema.js';
import { NutritionModule } from './nutrition/nutrition.module.js';
import { MealsModule } from './meals/meals.module.js';
import { LaboratoryModule } from './laboratory/laboratory.module.js';
import { DialysisModule } from './dialysis/dialysis.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,

      load: [
        appConfig,
        authConfig,
        databaseConfig,
      ],
      
      validate: (config) => envSchema.parse(config),
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    ProfilesModule,
    ConditionsModule,
    NutritionModule,
    MealsModule,
    LaboratoryModule,
    DialysisModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
