import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ProfileRepositoryMapper } from '../mappers/repository/profile-repository.mapper.js';
import { ProfileSource } from '../sources/profile.source.js';
import { UpdateProfileData } from '../types/update-profile.data.js';

@Injectable()
export class ProfilesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getMyProfile(userId: string): Promise<ProfileSource | null> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    return profile ? ProfileRepositoryMapper.toProfileSource(profile) : null;
  }

  async upsert(
    userId: string,
    data: UpdateProfileData,
  ): Promise<ProfileSource> {
    const profile = await this.prisma.profile.upsert({
      where: { userId },
      update: data,
      create: {
        ...data,
        userId,
      },
    });

    return ProfileRepositoryMapper.toProfileSource(profile);
  }
}
