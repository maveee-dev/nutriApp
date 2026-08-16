import { Injectable } from '@nestjs/common';
import { UserDialysisStatusSource } from '../sources/user-dialysis-status.source.js';
import { UpdateDialysisStatusInput } from '../types/update-dialysis-status.input.js';
import { UserDialysisStatusRepository } from '../repositories/user-dialysis-status.repository.js';

@Injectable()
export class UserDialysisStatusService {
  constructor(private readonly repository: UserDialysisStatusRepository) {}

  get(userId: string): Promise<UserDialysisStatusSource | null> {
    return this.repository.findByUserId(userId);
  }

  update(
    userId: string,
    input: UpdateDialysisStatusInput,
  ): Promise<UserDialysisStatusSource> {
    return this.repository.upsert(userId, input);
  }
}
