import { AuthResponseSource } from '../types/auth-source.type.js';
import { LoginResponseDto } from '../dto/auth-response.dto.js';
import { UserResponseMapper } from '../../users/mappers/controller/user-response.mapper.js';

export class AuthMapper {
  static toResponse(source: AuthResponseSource): LoginResponseDto {
    return {
      accessToken: source.accessToken,
      user: UserResponseMapper.toUserResponseDto(source.user),
    };
  }
}
