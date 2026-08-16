import { Logger, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserSource } from '../users/sources/user.source.js';
import { UsersService } from '../users/services/users.service.js';
import { RegisterData } from './types/register.data.js';
import { LoginData } from './types/login.data.js';
import { AuthEmailAlreadyExistsError } from './errors/email-already-exists.error.js';
import { InvalidCredentialsError } from './errors/invalid-credentials.error.js';
import { AuthenticatedUserNotFoundError } from './errors/authenticated-user-not-found.error.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(
    data: RegisterData
  ): Promise<UserSource> {
    this.logger.log(`Register attempt: ${data.email}`);

    const email = data.email.trim().toLowerCase();

    const existingUser = await this.usersService.findByEmail(email);

    if (existingUser) {
      this.logger.warn(`Register failed: email already exists - ${data.email}`);
      throw new AuthEmailAlreadyExistsError();
    }

    const hashedPassword  = await bcrypt.hash(data.password, 12);

    const user = await this.usersService.create(email, hashedPassword);

    this.logger.log(`User registered: ${user.id}`);

    return user;
  }

  async login(data: LoginData) {
    this.logger.log(`Login attempt: ${data.email}`);

    const email = data.email.trim().toLowerCase();

    const user = await this.usersService.findByEmailWithPassword(email);

    if (!user) {
      this.logger.warn(`Login failed: user not found - ${data.email}`);
      throw new InvalidCredentialsError();
    }

    const passwordMatch = await bcrypt.compare(
      data.password,
      user.password,
    );

    if (!passwordMatch) {
      this.logger.warn(`Login failed: invalid password - ${data.email}`);
      throw new InvalidCredentialsError();
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });

    this.logger.log(`Login success: ${user.id}`);
    
    return {
      accessToken,
      user,
    };
  }

  async getMe(userId: string) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new AuthenticatedUserNotFoundError();
    }

    return user;
  }
}
