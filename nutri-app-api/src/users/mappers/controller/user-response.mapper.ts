import { UserResponseDto } from '../../dto/response/user-response.dto.js';
import { UserSource } from '../../sources/user.source.js';

export class UserResponseMapper {
  static toUserResponseDto(source: UserSource): UserResponseDto {
    return {
      id: source.id,
      email: source.email,
      createdAt: source.createdAt,
    };
  }
}
