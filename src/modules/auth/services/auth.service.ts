import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, AuthProvider } from '../../user/schemas/user.schema';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { LoggerService } from '../../../common/services/logger.service';
import { EmailService } from '../../../common/services/email.service';
import { ConfigService } from '@nestjs/config';

interface OAuthUserData {
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  provider: string;
  providerId: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,
    private tokenService: TokenService,
    private sessionService: SessionService,
    private logger: LoggerService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {
    this.logger.setContext('AuthService');
  }

  async register(registerDto: RegisterDto) {
    const { email, password, firstName, lastName } = registerDto;

    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await this.hashPassword(password);
    const emailVerificationToken = this.tokenService.generateVerificationToken();
    const emailVerificationExpires = new Date();
    emailVerificationExpires.setHours(emailVerificationExpires.getHours() + 24);

    const user = new this.userModel({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      provider: AuthProvider.LOCAL,
      emailVerificationToken,
      emailVerificationExpires,
    });

    const savedUser = await user.save();
    this.logger.log(`New user registered: ${email}`);

    // Send verification email (currently logs to console - implement actual email sending)
    await this.emailService.sendVerificationEmail(email, emailVerificationToken);

    return {
      message: 'Registration successful. Please check your email to verify your account.',
      userId: savedUser._id,
    };
  }

  async login(loginDto: LoginDto, userAgent?: string, ipAddress?: string) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    return this.generateTokensAndSession(user, userAgent, ipAddress);
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userModel.findOne({ email });

    if (!user || !user.password) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async validateOAuthUser(oauthData: OAuthUserData): Promise<User> {
    const { email, firstName, lastName, avatar, provider, providerId } = oauthData;

    let user = await this.userModel.findOne({
      $or: [{ email }, { providerId, provider: provider as AuthProvider }],
    });

    if (user) {
      if (!user.avatar && avatar) {
        user.avatar = avatar;
      }
      if (!user.isEmailVerified && provider !== 'local') {
        user.isEmailVerified = true;
      }
      user.lastLoginAt = new Date();
      await user.save();
    } else {
      user = new this.userModel({
        email,
        firstName,
        lastName,
        avatar,
        provider: provider as AuthProvider,
        providerId,
        isEmailVerified: true,
      });
      user = await user.save();
      this.logger.log(`New OAuth user created: ${email} (${provider})`);
    }

    return user;
  }

  async refreshToken(refreshToken: string, userAgent?: string, ipAddress?: string) {
    const tokenData = await this.tokenService.verifyRefreshToken(refreshToken);

    if (!tokenData) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.userModel.findById(tokenData.userId);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const newRefreshToken = await this.tokenService.generateRefreshToken(
      user,
      userAgent,
      ipAddress,
    );

    await this.tokenService.revokeRefreshToken(refreshToken, newRefreshToken.token);

    const accessToken = await this.tokenService.generateAccessToken(user);

    return {
      accessToken,
      refreshToken: newRefreshToken.token,
      expiresIn: this.getExpiresIn(),
    };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.tokenService.revokeRefreshToken(refreshToken);
    }

    await this.sessionService.deactivateUserSessions(userId);

    this.logger.log(`User logged out: ${userId}`);

    return { message: 'Logged out successfully' };
  }

  async verifyEmail(token: string) {
    const user = await this.userModel.findOne({
      emailVerificationToken: token,
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    if (!user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
      throw new BadRequestException('Verification token has expired');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;

    await user.save();

    this.logger.log(`Email verified: ${user.email}`);

    return { message: 'Email verified successfully' };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.userModel.findOne({ email });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const emailVerificationToken = this.tokenService.generateVerificationToken();
    const emailVerificationExpires = new Date();
    emailVerificationExpires.setHours(emailVerificationExpires.getHours() + 24);

    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationExpires = emailVerificationExpires;

    await user.save();

    // Resend verification email (currently logs to console - implement actual email sending)
    await this.emailService.sendVerificationEmail(email, emailVerificationToken);

    return { message: 'Verification email sent' };
  }

  async forgotPassword(email: string) {
    const user = await this.userModel.findOne({ email });

    if (!user) {
      return { message: 'If the email exists, a password reset link has been sent' };
    }

    const resetToken = this.tokenService.generatePasswordResetToken();
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1);

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetExpires;

    await user.save();

    this.logger.log(`Password reset requested: ${email}`);

    // Send password reset email (currently logs to console - implement actual email sending)
    await this.emailService.sendPasswordResetEmail(email, resetToken);

    return { message: 'If the email exists, a password reset link has been sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.userModel.findOne({
      passwordResetToken: token,
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    const hashedPassword = await this.hashPassword(newPassword);

    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    await this.tokenService.revokeAllUserTokens((user._id as any).toString());

    this.logger.log(`Password reset successful: ${user.email}`);

    // Notify user of password change (currently logs to console - implement actual email sending)
    await this.emailService.sendPasswordChangedEmail(user.email);

    return { message: 'Password reset successful' };
  }

  private async generateTokensAndSession(user: User, userAgent?: string, ipAddress?: string) {
    const accessToken = await this.tokenService.generateAccessToken(user);
    const refreshToken = await this.tokenService.generateRefreshToken(user, userAgent, ipAddress);

    await this.sessionService.createSession(user, userAgent, ipAddress);

    user.lastLoginAt = new Date();
    await user.save();

    const userObject = user.toObject();
    delete userObject.password;

    return {
      accessToken,
      refreshToken: refreshToken.token,
      user: userObject,
      expiresIn: this.getExpiresIn(),
    };
  }

  private async hashPassword(password: string): Promise<string> {
    const rounds = parseInt(this.configService.get<string>('BCRYPT_ROUNDS', '10'), 10);
    return bcrypt.hash(password, rounds);
  }

  private getExpiresIn(): number {
    const expiresIn = this.configService.get<string>('JWT_EXPIRATION', '15m');
    const match = expiresIn.match(/(\d+)([dhms])/);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2];
      switch (unit) {
        case 'd':
          return value * 24 * 60 * 60;
        case 'h':
          return value * 60 * 60;
        case 'm':
          return value * 60;
        case 's':
          return value;
      }
    }
    return 900;
  }
}
