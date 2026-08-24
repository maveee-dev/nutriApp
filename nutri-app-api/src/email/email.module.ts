import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service.js';
import { EMAIL_PROVIDER } from './email.tokens.js';
import { ResendEmailProvider } from './providers/resend-email.provider.js';

@Module({
  imports: [ConfigModule],
  providers: [
    ResendEmailProvider,
    { provide: EMAIL_PROVIDER, useExisting: ResendEmailProvider },
    EmailService,
  ],
  exports: [EmailService],
})
export class EmailModule {}

