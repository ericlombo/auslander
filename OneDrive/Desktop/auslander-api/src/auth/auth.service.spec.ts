import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { TenantsService } from '../tenants/tenants.service';

const mockTenant = { id: 'tenant-uuid-1', name: 'Test Tenant', createdAt: new Date() };
const mockUser = {
  id: 'user-uuid-1',
  email: 'test@example.com',
  password: '$2a$12$hashedpassword',
  tenantId: 'tenant-uuid-1',
  createdAt: new Date(),
};

const mockUsersService = {
  findByEmailAndTenant: jest.fn(),
  create: jest.fn(),
  validatePassword: jest.fn(),
};

const mockTenantsService = {
  findById: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: TenantsService, useValue: mockTenantsService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user and return a JWT', async () => {
      mockTenantsService.findById.mockResolvedValue(mockTenant);
      mockUsersService.findByEmailAndTenant.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await service.register({
        email: 'test@example.com',
        password: 'Password123!',
        tenantId: 'tenant-uuid-1',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe('test@example.com');
      expect(mockUsersService.create).toHaveBeenCalledWith(
        'test@example.com',
        'Password123!',
        'tenant-uuid-1',
      );
    });

    it('should throw ConflictException if user already exists', async () => {
      mockTenantsService.findById.mockResolvedValue(mockTenant);
      mockUsersService.findByEmailAndTenant.mockResolvedValue(mockUser);

      await expect(
        service.register({ email: 'test@example.com', password: 'Password123!', tenantId: 'tenant-uuid-1' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should return a JWT on valid credentials', async () => {
      mockTenantsService.findById.mockResolvedValue(mockTenant);
      mockUsersService.findByEmailAndTenant.mockResolvedValue(mockUser);
      mockUsersService.validatePassword.mockResolvedValue(true);

      const result = await service.login({
        email: 'test@example.com',
        password: 'Password123!',
        tenantId: 'tenant-uuid-1',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
    });

    it('should throw UnauthorizedException on wrong password', async () => {
      mockTenantsService.findById.mockResolvedValue(mockTenant);
      mockUsersService.findByEmailAndTenant.mockResolvedValue(mockUser);
      mockUsersService.validatePassword.mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@example.com', password: 'WrongPassword', tenantId: 'tenant-uuid-1' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockTenantsService.findById.mockResolvedValue(mockTenant);
      mockUsersService.findByEmailAndTenant.mockResolvedValue(null);

      await expect(
        service.login({ email: 'noone@example.com', password: 'Password123!', tenantId: 'tenant-uuid-1' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
