import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { Session } from '../auth/schemas/session.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,
    @InjectModel(Session.name)
    private sessionModel: Model<Session>,
  ) {}

  async getUserProfile(userId: string) {
    const user = await this.userModel.findById(userId).select('-password');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(
    userId: string,
    updateData: { firstName?: string; lastName?: string; avatar?: string },
  ) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    Object.assign(user, updateData);
    const updatedUser = await user.save();

    const userObject: any = updatedUser.toObject();
    delete userObject.password;

    return {
      message: 'Profile updated successfully',
      user: userObject,
    };
  }

  async getUserSessions(userId: string) {
    const sessions = await this.sessionModel
      .find({ userId, isActive: true })
      .sort({ lastActivityAt: -1 })
      .exec();

    return sessions;
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.sessionModel.findOne({
      sessionId,
      userId,
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    session.isActive = false;
    await session.save();

    return { message: 'Session revoked successfully' };
  }

  async revokeAllSessions(userId: string) {
    await this.sessionModel.updateMany({ userId }, { isActive: false });

    return { message: 'All sessions revoked successfully' };
  }
}
