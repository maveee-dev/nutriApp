import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/types/jwt-payload.interface.js';
import { UpdateProfileDto } from '../dto/request/update-profile.dto.js';
import { ProfileResponseDto } from '../dto/response/profile-response.dto.js';
import { ProfileResponseMapper } from '../mappers/controller/profile-response.mapper.js';
import { ProfilesService } from '../services/profiles.service.js';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('me')
  async getMe(
    @CurrentUser() user: JwtPayload,
  ): Promise<ProfileResponseDto> {
    const profile = await this.profilesService.getMyProfile(user.sub);

    return ProfileResponseMapper.toProfileResponseDto(profile);
  }

  @Put()
  async update(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    const profile = await this.profilesService.upsertMyProfile(user.sub, dto);

    return ProfileResponseMapper.toProfileResponseDto(profile);
  }
}
