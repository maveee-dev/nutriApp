import { UserResponseDto } from '../../users/dto/response/user-response.dto.js';

export class LoginResponseDto {
  readonly accessToken!: string;
  readonly user!: UserResponseDto;
}
