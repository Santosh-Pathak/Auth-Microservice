import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Session } from '../schemas/session.schema';
import { User } from '../../user/schemas/user.schema';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SessionService {
  constructor(
    @InjectModel(Session.name)
    private sessionModel: Model<Session>,
    private configService: ConfigService,
  ) {}

  async createSession(user: User, userAgent?: string, ipAddress?: string): Promise<Session> {
    const sessionId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { device, browser, os } = this.parseUserAgent(userAgent);

    const session = new this.sessionModel({
      sessionId,
      userId: user._id,
      userAgent,
      ipAddress,
      device,
      browser,
      os,
      expiresAt,
      isActive: true,
    });

    return session.save();
  }

  async getUserSessions(userId: string): Promise<Session[]> {
    return this.sessionModel
      .find({ userId, isActive: true })
      .sort({ lastActivityAt: -1 })
      .exec();
  }

  async deactivateSession(sessionId: string): Promise<void> {
    await this.sessionModel.updateOne({ sessionId }, { isActive: false });
  }

  async deactivateUserSessions(userId: string): Promise<void> {
    await this.sessionModel.updateMany({ userId }, { isActive: false });
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    await this.sessionModel.updateOne({ sessionId }, { lastActivityAt: new Date() });
  }

  private parseUserAgent(userAgent?: string): {
    device: string;
    browser: string;
    os: string;
  } {
    if (!userAgent) {
      return { device: 'Unknown', browser: 'Unknown', os: 'Unknown' };
    }

    let device = 'Desktop';
    let browser = 'Unknown';
    let os = 'Unknown';

    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac OS X')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad'))
      os = 'iOS';

    if (
      userAgent.includes('Mobile') ||
      userAgent.includes('Android') ||
      userAgent.includes('iPhone')
    ) {
      device = 'Mobile';
    } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
      device = 'Tablet';
    }

    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    else if (userAgent.includes('MSIE') || userAgent.includes('Trident'))
      browser = 'Internet Explorer';

    return { device, browser, os };
  }
}
