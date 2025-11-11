import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    example: 'verification-token-here',
    description: 'Email verification token from email',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}

