import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { UsersModule } from '../users/users.module.js';
import { EmailModule } from '../email/email.module.js';
import { OtpService } from './otp/otp.service.js';
import { AuthOtpChallengeRepository } from './otp/auth-otp-challenge.repository.js';
import { RefreshTokenService } from './refresh/refresh-token.service.js';
import { RefreshTokenSessionRepository } from './refresh/refresh-token-session.repository.js';
import { PASSWORD_HASHER } from './auth.tokens.js';
import { BcryptPasswordHasher } from './security/bcrypt-password-hasher.js';
import { PasswordResetRepository } from './password-reset/password-reset.repository.js';
import { GoogleStrategy } from './strategies/google.strategy.js';

@Module({
  imports: [
    UsersModule,
    EmailModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.getOrThrow<number>('accessTokenTtlSeconds'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,  
    GoogleStrategy,
    OtpService,
    AuthOtpChallengeRepository,
    RefreshTokenService,
    RefreshTokenSessionRepository,
    { provide: BcryptPasswordHasher, useFactory: () => new BcryptPasswordHasher(12) },
    { provide: PASSWORD_HASHER, useExisting: BcryptPasswordHasher },
    PasswordResetRepository,
  ]
})
export class AuthModule {}
