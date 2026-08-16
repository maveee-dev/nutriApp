import { Controller, Get, Query } from '@nestjs/common';
import { OffsetPaginatedResponseDto } from '../../common/pagination/offset/dto/offset-paginated-response.dto.js';
import { OffsetPaginatedResponseMapper } from '../../common/pagination/offset/mappers/paginated-response.mapper.js';
import { FindUsersDto } from '../dto/request/find-users.dto.js';
import { UserResponseDto } from '../dto/response/user-response.dto.js';
import { UserResponseMapper } from '../mappers/controller/user-response.mapper.js';
import { UsersService } from '../services/users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findMany(
    @Query() query: FindUsersDto,
  ): Promise<OffsetPaginatedResponseDto<UserResponseDto>> {
    const users = await this.usersService.findMany(query);

    return OffsetPaginatedResponseMapper.toResponse(
      users,
      UserResponseMapper.toUserResponseDto,
    );
  }
}
