import { Body, Controller, Post, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../common/types/jwt-payload.interface.js';
import { UserResponseDto } from '../users/dto/response/user-response.dto.js';
import { UserResponseMapper } from '../users/mappers/controller/user-response.mapper.js';
import { LoginResponseDto } from './dto/auth-response.dto.js';
import { AuthMapper } from './mappers/auth.mapper.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto
  ): Promise<UserResponseDto> {
    const user = await this.authService.register(dto);
    
    return UserResponseMapper.toUserResponseDto(user);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto
  ): Promise<LoginResponseDto>{
    const result = await this.authService.login(dto);

    return AuthMapper.toResponse(result);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(
    @CurrentUser() user: JwtPayload
  ): Promise<UserResponseDto> {
    const result = await this.authService.getMe(user.sub);

    return UserResponseMapper.toUserResponseDto(result);
  }

}

