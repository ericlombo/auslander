import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { TenantsService } from '../tenants/tenants.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    tenantId: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tenantsService: TenantsService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    // Verify tenant exists
    await this.tenantsService.findById(registerDto.tenantId);

    // Check if user already exists in this tenant
    const existingUser = await this.usersService.findByEmailAndTenant(
      registerDto.email,
      registerDto.tenantId,
    );

    if (existingUser) {
      throw new ConflictException(
        'A user with this email already exists in this tenant',
      );
    }

    const user = await this.usersService.create(
      registerDto.email,
      registerDto.password,
      registerDto.tenantId,
    );

    return this.buildAuthResponse(user);
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    // Verify tenant exists
    await this.tenantsService.findById(loginDto.tenantId);

    const user = await this.usersService.findByEmailAndTenant(
      loginDto.email,
      loginDto.tenantId,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.usersService.validatePassword(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: any): AuthResponse {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
      },
    };
  }
}
