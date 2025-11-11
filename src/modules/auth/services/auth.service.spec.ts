import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { LoggerService } from '../../../common/services/logger.service';
import { EmailService } from '../../../common/services/email.service';
import { ConfigService } from '@nestjs/config';
import { User, AuthProvider } from '../../user/schemas/user.schema';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let userModel: any;
  let tokenService: TokenService;
  let sessionService: SessionService;
  let emailService: EmailService;

  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    password: '$2b$10$hashedPassword',
    firstName: 'John',
    lastName: 'Doe',
    provider: AuthProvider.LOCAL,
    isActive: true,
    isEmailVerified: false,
    save: jest.fn().mockResolvedValue(this),
    toObject: jest.fn().mockReturnValue({
      _id: '507f1f77bcf86cd799439011',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
    }),
  };

  const mockUserModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    new: jest.fn().mockResolvedValue(mockUser),
  };

  const mockTokenService = {
    generateAccessToken: jest.fn().mockResolvedValue('access-token'),
    generateRefreshToken: jest.fn().mockResolvedValue({ token: 'refresh-token' }),
    generateVerificationToken: jest.fn().mockReturnValue('verification-token'),
    generatePasswordResetToken: jest.fn().mockReturnValue('reset-token'),
    revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
    revokeAllUserTokens: jest.fn().mockResolvedValue(undefined),
  };

  const mockSessionService = {
    createSession: jest.fn().mockResolvedValue({}),
    deactivateUserSessions: jest.fn().mockResolvedValue(undefined),
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    setContext: jest.fn(),
  };

  const mockEmailService = {
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordChangedEmail: jest.fn().mockResolvedValue(undefined),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        JWT_EXPIRATION: '15m',
        JWT_REFRESH_EXPIRATION: '7d',
        BCRYPT_ROUNDS: '10',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userModel = module.get(getModelToken(User.name));
    tokenService = module.get<TokenService>(TokenService);
    sessionService = module.get<SessionService>(SessionService);
    emailService = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        password: 'Test@1234',
        firstName: 'New',
        lastName: 'User',
      };

      mockUserModel.findOne.mockResolvedValue(null);
      mockUserModel.new = jest.fn().mockImplementation(() => ({
        ...mockUser,
        email: registerDto.email,
        save: jest.fn().mockResolvedValue({ _id: 'newUserId' }),
      }));

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('userId');
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: registerDto.email });
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should throw ConflictException if user already exists', async () => {
      const registerDto = {
        email: 'existing@example.com',
        password: 'Test@1234',
        firstName: 'Existing',
        lastName: 'User',
      };

      mockUserModel.findOne.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('validateUser', () => {
    it('should return user for valid credentials', async () => {
      const email = 'test@example.com';
      const password = 'Test@1234';

      mockUserModel.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.validateUser(email, password);

      expect(result).toBeDefined();
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email });
    });

    it('should return null for invalid password', async () => {
      const email = 'test@example.com';
      const password = 'WrongPassword';

      mockUserModel.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      const result = await service.validateUser(email, password);

      expect(result).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@example.com', 'password');

      expect(result).toBeNull();
    });
  });

  describe('verifyEmail', () => {
    it('should successfully verify email with valid token', async () => {
      const token = 'valid-token';
      const user = {
        ...mockUser,
        emailVerificationToken: token,
        emailVerificationExpires: new Date(Date.now() + 3600000),
        save: jest.fn().mockResolvedValue(this),
      };

      mockUserModel.findOne.mockResolvedValue(user);

      const result = await service.verifyEmail(token);

      expect(result).toHaveProperty('message');
      expect(user.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid token', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for expired token', async () => {
      const user = {
        ...mockUser,
        emailVerificationToken: 'token',
        emailVerificationExpires: new Date(Date.now() - 3600000), // Expired
      };

      mockUserModel.findOne.mockResolvedValue(user);

      await expect(service.verifyEmail('token')).rejects.toThrow(BadRequestException);
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email for existing user', async () => {
      const email = 'test@example.com';
      const user = {
        ...mockUser,
        save: jest.fn().mockResolvedValue(this),
      };

      mockUserModel.findOne.mockResolvedValue(user);

      const result = await service.forgotPassword(email);

      expect(result).toHaveProperty('message');
      expect(user.save).toHaveBeenCalled();
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('should return generic message for non-existent user (security)', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      const result = await service.forgotPassword('nonexistent@example.com');

      expect(result).toHaveProperty('message');
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should successfully reset password with valid token', async () => {
      const token = 'valid-reset-token';
      const newPassword = 'NewPassword@123';
      const user = {
        ...mockUser,
        _id: '507f1f77bcf86cd799439011',
        passwordResetToken: token,
        passwordResetExpires: new Date(Date.now() + 3600000),
        save: jest.fn().mockResolvedValue(this),
      };

      mockUserModel.findOne.mockResolvedValue(user);

      const result = await service.resetPassword(token, newPassword);

      expect(result).toHaveProperty('message');
      expect(user.save).toHaveBeenCalled();
      expect(mockTokenService.revokeAllUserTokens).toHaveBeenCalled();
      expect(mockEmailService.sendPasswordChangedEmail).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid token', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      await expect(service.resetPassword('invalid-token', 'NewPassword@123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for expired token', async () => {
      const user = {
        ...mockUser,
        passwordResetToken: 'token',
        passwordResetExpires: new Date(Date.now() - 3600000), // Expired
      };

      mockUserModel.findOne.mockResolvedValue(user);

      await expect(service.resetPassword('token', 'NewPassword@123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const refreshToken = 'refresh-token';

      const result = await service.logout(userId, refreshToken);

      expect(result).toHaveProperty('message');
      expect(mockTokenService.revokeRefreshToken).toHaveBeenCalledWith(refreshToken);
      expect(mockSessionService.deactivateUserSessions).toHaveBeenCalledWith(userId);
    });

    it('should logout without refresh token', async () => {
      const userId = '507f1f77bcf86cd799439011';

      const result = await service.logout(userId);

      expect(result).toHaveProperty('message');
      expect(mockTokenService.revokeRefreshToken).not.toHaveBeenCalled();
      expect(mockSessionService.deactivateUserSessions).toHaveBeenCalledWith(userId);
    });
  });
});

