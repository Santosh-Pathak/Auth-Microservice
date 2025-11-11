import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID'),
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GITHUB_CALLBACK_URL'),
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: Function,
  ): Promise<any> {
    const { id, emails, displayName, photos, username } = profile;

    // GitHub might not always provide email in profile
    const email = emails?.[0]?.value || `${username}@github.local`;

    const nameParts = displayName ? displayName.split(' ') : [username];
    const firstName = nameParts[0] || username;
    const lastName = nameParts.slice(1).join(' ') || '';

    const user = await this.authService.validateOAuthUser({
      email,
      firstName,
      lastName,
      avatar: photos?.[0]?.value,
      provider: 'github',
      providerId: id,
    });

    done(null, user);
  }
}

