import { UserDialysisStatusResponseDto } from '../../dto/response/user-dialysis-status-response.dto.js';
import { UserDialysisStatusSource } from '../../sources/user-dialysis-status.source.js';

export class UserDialysisStatusResponseMapper {
  static toResponseDto(source: UserDialysisStatusSource): UserDialysisStatusResponseDto {
    return {
      status: source.status,
      modality: source.modality,
      frequency: source.frequency,
      schedule: source.schedule,
      effectiveAt: source.effectiveAt,
      reportedAt: source.reportedAt,
      updatedAt: source.updatedAt,
    };
  }
}
