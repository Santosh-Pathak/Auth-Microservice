import { Module, DynamicModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { SessionService } from './services/session.service';
import { User, UserSchema } from '../user/schemas/user.schema';
import { RefreshToken, RefreshTokenSchema } from './schemas/refresh-token.schema';
import { Session, SessionSchema } from './schemas/session.schema';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';

@Module({})
export class AuthModule {
  static forRoot(): DynamicModule {
    return {
      module: AuthModule,
      imports: [
        MongooseModule.forFeature([
          { name: User.name, schema: UserSchema },
          { name: RefreshToken.name, schema: RefreshTokenSchema },
          { name: Session.name, schema: SessionSchema },
        ]),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: async (configService: ConfigService) => ({
            secret: configService.get<string>('JWT_SECRET'),
            signOptions: {
              expiresIn: configService.get<string>('JWT_EXPIRATION', '15m'),
            },
          }),
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        TokenService,
        SessionService,
        JwtStrategy,
        LocalStrategy,
        // Conditionally add OAuth strategies
        {
          provide: 'GOOGLE_STRATEGY',
          useFactory: (configService: ConfigService, authService: AuthService) => {
            const clientId = configService.get<string>('GOOGLE_CLIENT_ID');
            if (clientId && clientId.trim().length > 0) {
              return new GoogleStrategy(configService, authService);
            }
            return null;
          },
          inject: [ConfigService, AuthService],
        },
        {
          provide: 'GITHUB_STRATEGY',
          useFactory: (configService: ConfigService, authService: AuthService) => {
            const clientId = configService.get<string>('GITHUB_CLIENT_ID');
            if (clientId && clientId.trim().length > 0) {
              return new GithubStrategy(configService, authService);
            }
            return null;
          },
          inject: [ConfigService, AuthService],
        },
      ],
      exports: [AuthService, TokenService, SessionService],
    };
  }
}
