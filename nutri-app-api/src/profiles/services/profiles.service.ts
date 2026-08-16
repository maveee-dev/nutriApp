import { Injectable } from '@nestjs/common';
import { ProfileNotFoundError } from '../errors/profile-not-found.error.js';
import { ProfilesRepository } from '../repositories/profiles.repository.js';
import { ProfileSource } from '../sources/profile.source.js';
import { UpdateProfileData } from '../types/update-profile.data.js';

@Injectable()
export class ProfilesService {
  constructor(private readonly profilesRepository: ProfilesRepository) {}

  async getMyProfile(userId: string): Promise<ProfileSource> {
    const profile = await this.profilesRepository.getMyProfile(userId);

    if (!profile) {
      throw new ProfileNotFoundError();
    }

    return profile;
  }

  upsertMyProfile(
    userId: string,
    data: UpdateProfileData,
  ): Promise<ProfileSource> {
    return this.profilesRepository.upsert(userId, data);
  }
}
