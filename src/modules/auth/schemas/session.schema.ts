import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Session extends Document {
  @Prop({ required: true, unique: true, index: true })
  sessionId: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User', index: true })
  userId: Types.ObjectId;

  @Prop()
  userAgent: string;

  @Prop()
  ipAddress: string;

  @Prop()
  device: string;

  @Prop()
  browser: string;

  @Prop()
  os: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: Date.now })
  lastActivityAt: Date;

  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }
}

export const SessionSchema = SchemaFactory.createForClass(Session);

