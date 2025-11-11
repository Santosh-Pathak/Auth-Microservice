import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from './logger.service';

/**
 * Email Service
 * 
 * TODO: Implement actual email sending functionality
 * 
 * This is a placeholder service that logs email operations.
 * To implement actual email sending:
 * 
 * 1. Install email dependencies:
 *    npm install nodemailer @types/nodemailer
 *    OR
 *    npm install @sendgrid/mail
 * 
 * 2. Configure email settings in .env (already present in .env.example)
 * 
 * 3. Implement the email sending logic in this service
 * 
 * 4. Update auth.service.ts to call these methods after:
 *    - User registration (send verification email)
 *    - Password reset request (send reset link)
 *    - Email verification resend
 */
@Injectable()
export class EmailService {
  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
  ) {
    this.logger.setContext('EmailService');
  }

  /**
   * Send email verification link
   * @param email User email address
   * @param token Verification token
   */
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    // TODO: Implement actual email sending
    const verificationUrl = `${this.configService.get('FRONTEND_URL')}/verify-email?token=${token}`;
    
    this.logger.log(`[MOCK] Sending verification email to ${email}`);
    this.logger.log(`[MOCK] Verification URL: ${verificationUrl}`);
    
    // Example implementation with nodemailer:
    // await this.transporter.sendMail({
    //   from: this.configService.get('EMAIL_FROM'),
    //   to: email,
    //   subject: 'Verify Your Email Address',
    //   html: `<p>Click <a href="${verificationUrl}">here</a> to verify your email.</p>`,
    // });
  }

  /**
   * Send password reset link
   * @param email User email address
   * @param token Reset token
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    // TODO: Implement actual email sending
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${token}`;
    
    this.logger.log(`[MOCK] Sending password reset email to ${email}`);
    this.logger.log(`[MOCK] Reset URL: ${resetUrl}`);
    
    // Example implementation with nodemailer:
    // await this.transporter.sendMail({
    //   from: this.configService.get('EMAIL_FROM'),
    //   to: email,
    //   subject: 'Reset Your Password',
    //   html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`,
    // });
  }

  /**
   * Send welcome email after successful registration
   * @param email User email address
   * @param firstName User first name
   */
  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    // TODO: Implement actual email sending
    this.logger.log(`[MOCK] Sending welcome email to ${email}`);
    
    // Example implementation:
    // await this.transporter.sendMail({
    //   from: this.configService.get('EMAIL_FROM'),
    //   to: email,
    //   subject: 'Welcome to Our Service!',
    //   html: `<p>Hi ${firstName}, welcome to our service!</p>`,
    // });
  }

  /**
   * Send password changed notification
   * @param email User email address
   */
  async sendPasswordChangedEmail(email: string): Promise<void> {
    // TODO: Implement actual email sending
    this.logger.log(`[MOCK] Sending password changed notification to ${email}`);
    
    // Example implementation:
    // await this.transporter.sendMail({
    //   from: this.configService.get('EMAIL_FROM'),
    //   to: email,
    //   subject: 'Password Changed Successfully',
    //   html: '<p>Your password has been changed successfully. If you did not make this change, please contact support immediately.</p>',
    // });
  }
}

