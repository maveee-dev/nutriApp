import { Type } from "class-transformer";
import { IsOptional, IsUUID, Max, Min } from "class-validator";

export class CursorPaginationQueryDto {
  @IsOptional()
  @IsUUID()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: 1
}