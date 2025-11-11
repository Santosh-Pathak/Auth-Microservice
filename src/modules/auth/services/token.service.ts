import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RefreshToken } from '../schemas/refresh-token.schema';
import { User } from '../../user/schemas/user.schema';
import * as crypto from 'crypto';

@Injectable()
export class TokenService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectModel(RefreshToken.name)
    private refreshTokenModel: Model<RefreshToken>,
  ) {}

  async generateAccessToken(user: User): Promise<string> {
    const payload = {
      sub: (user._id as any).toString(),
      email: user.email,
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRATION', '15m'),
    });
  }

  async generateRefreshToken(
    user: User,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<RefreshToken> {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d');

    const expiresAt = new Date();
    const match = expiresIn.match(/(\d+)([dhms])/);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2];
      switch (unit) {
        case 'd':
          expiresAt.setDate(expiresAt.getDate() + value);
          break;
        case 'h':
          expiresAt.setHours(expiresAt.getHours() + value);
          break;
        case 'm':
          expiresAt.setMinutes(expiresAt.getMinutes() + value);
          break;
        case 's':
          expiresAt.setSeconds(expiresAt.getSeconds() + value);
          break;
      }
    }

    const refreshToken = new this.refreshTokenModel({
      token,
      userId: user._id,
      expiresAt,
      userAgent,
      ipAddress,
    });

    return refreshToken.save();
  }

  async verifyRefreshToken(token: string): Promise<RefreshToken | null> {
    const refreshToken = await this.refreshTokenModel
      .findOne({ token })
      .populate('userId')
      .exec();

    if (!refreshToken || !refreshToken.isActive) {
      return null;
    }

    return refreshToken;
  }

  async revokeRefreshToken(token: string, replacedByToken?: string): Promise<void> {
    await this.refreshTokenModel.updateOne(
      { token },
      {
        isRevoked: true,
        revokedAt: new Date(),
        replacedByToken,
      },
    );
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenModel.updateMany(
      { userId, isRevoked: false },
      {
        isRevoked: true,
        revokedAt: new Date(),
      },
    );
  }

  async cleanupExpiredTokens(): Promise<void> {
    await this.refreshTokenModel.deleteMany({
      expiresAt: { $lt: new Date() },
    });
  }

  generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  generatePasswordResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
