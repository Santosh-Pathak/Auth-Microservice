import { Global, Module } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { EmailService } from './email.service';

@Global()
@Module({
  providers: [LoggerService, EmailService],
  exports: [LoggerService, EmailService],
})
export class LoggerModule {}

