import { Injectable } from '@nestjs/common';
import { MongooseModuleOptions, MongooseOptionsFactory } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseConfig implements MongooseOptionsFactory {
  constructor(private configService: ConfigService) {}

  createMongooseOptions(): MongooseModuleOptions {
    const uri = this.configService.get<string>(
      'MONGODB_URI',
      'mongodb://localhost:27017/auth_microservice',
    );

    return {
      uri,
      retryAttempts: 3,
      retryDelay: 1000,
    };
  }
}
