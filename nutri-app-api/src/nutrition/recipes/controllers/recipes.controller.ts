import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../../common/types/jwt-payload.interface.js';
import { RecipeResponseDto } from '../dto/response/recipe-response.dto.js';
import { RecipeEvaluationQueryDto } from '../dto/request/recipe-evaluation-query.dto.js';
import { RecipeEvaluationResponseDto } from '../dto/response/recipe-evaluation-response.dto.js';
import { RecipeEvaluationResponseMapper } from '../mappers/controller/recipe-evaluation-response.mapper.js';
import { RecipeResponseMapper } from '../mappers/controller/recipe-response.mapper.js';
import { RecipeEvaluationService } from '../services/recipe-evaluation.service.js';
import { RecipesService } from '../services/recipes.service.js';

@Controller('nutrition/recipes')
@UseGuards(JwtAuthGuard)
export class RecipesController {
  constructor(
    private readonly recipesService: RecipesService,
    private readonly recipeEvaluationService: RecipeEvaluationService,
  ) {}

  @Get()
  async findMany(@CurrentUser() user: JwtPayload): Promise<RecipeResponseDto[]> {
    const recipes = await this.recipesService.findMany(user.sub);
    return recipes.map(RecipeResponseMapper.toDto);
  }

  @Get(':id/evaluation')
  async evaluate(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: RecipeEvaluationQueryDto,
  ): Promise<RecipeEvaluationResponseDto> {
    const result = await this.recipeEvaluationService.evaluate(user.sub, id, query.version);
    return RecipeEvaluationResponseMapper.toDto(result);
  }

  @Get(':id')
  async findById(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string): Promise<RecipeResponseDto> {
    return RecipeResponseMapper.toDto(await this.recipesService.findById(user.sub, id));
  }
}
