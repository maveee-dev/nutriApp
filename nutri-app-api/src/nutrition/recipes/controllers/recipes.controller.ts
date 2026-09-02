import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Optional, Param, ParseUUIDPipe, Post, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../../common/types/jwt-payload.interface.js';
import { RecipeResponseDto } from '../dto/response/recipe-response.dto.js';
import { RecipeEvaluationQueryDto } from '../dto/request/recipe-evaluation-query.dto.js';
import { AddRecipeToDailyTrackerDto } from '../dto/request/add-recipe-to-daily-tracker.dto.js';
import { CreateRecipeDto } from '../dto/request/create-recipe.dto.js';
import { UpdateRecipeDto } from '../dto/request/update-recipe.dto.js';
import { RecipeEvaluationResponseDto } from '../dto/response/recipe-evaluation-response.dto.js';
import { RecipeNutritionResponseDto } from '../dto/response/recipe-nutrition-response.dto.js';
import { RecipeEvaluationResponseMapper } from '../mappers/controller/recipe-evaluation-response.mapper.js';
import { RecipeResponseMapper } from '../mappers/controller/recipe-response.mapper.js';
import { RecipeNutritionResponseMapper } from '../mappers/controller/recipe-nutrition-response.mapper.js';
import { RecipeEvaluationService } from '../services/recipe-evaluation.service.js';
import { RecipeNutritionService } from '../services/recipe-nutrition.service.js';
import { RecipesService } from '../services/recipes.service.js';
import { DailyTrackerService } from '../../daily-tracker/services/daily-tracker.service.js';
import type { RecipeWriteInput } from '../repositories/recipes.repository.js';

@Controller(['nutrition/recipes', 'recipes'])
@UseGuards(JwtAuthGuard)
export class RecipesController {
  constructor(
    private readonly recipesService: RecipesService,
    private readonly recipeEvaluationService: RecipeEvaluationService,
    @Optional() private readonly recipeNutritionService?: RecipeNutritionService,
    @Optional() private readonly dailyTrackerService?: DailyTrackerService,
  ) {}

  @Get()
  async findMany(@CurrentUser() user: JwtPayload): Promise<RecipeResponseDto[]> {
    const recipes = await this.recipesService.findMany(user.sub);
    return recipes.map(RecipeResponseMapper.toDto);
  }

  @Post()
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateRecipeDto): Promise<RecipeResponseDto> {
    return RecipeResponseMapper.toDto(await this.recipesService.create(user.sub, this.toWriteInput(dto)));
  }

  @Patch(':id')
  async update(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRecipeDto): Promise<RecipeResponseDto> {
    const current = await this.recipesService.findById(user.sub, id);
    const version = current.versions[0];
    if (version == null) throw new Error('Recipe has no editable version.');
    return RecipeResponseMapper.toDto(await this.recipesService.update(user.sub, id, {
      name: dto.name ?? version.name,
      description: dto.description ?? version.description ?? undefined,
      servings: dto.servings ?? version.yieldServings,
      preparationInstructions: dto.preparationInstructions ?? version.preparationInstructions ?? undefined,
      visibility: dto.visibility ?? current.visibility,
      ingredients: (dto.ingredients ?? version.components).map((ingredient) => ({
        foodId: ingredient.foodId,
        servingId: ingredient.servingId ?? undefined,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        role: ingredient.role,
        notes: ingredient.notes ?? undefined,
      })),
    }, dto.isFavorite));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.recipesService.remove(user.sub, id);
  }

  @Get(':id/evaluation')
  async evaluate(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: RecipeEvaluationQueryDto,
  ): Promise<RecipeEvaluationResponseDto> {
    const result = await this.recipeEvaluationService.evaluate(user.sub, id, query.version, query.servings);
    return RecipeEvaluationResponseMapper.toDto(result);
  }

  @Post(':id/evaluate')
  async evaluatePost(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: RecipeEvaluationQueryDto,
  ): Promise<RecipeEvaluationResponseDto> {
    return this.evaluate(user, id, query);
  }

  @Get(':id/nutrition')
  async nutrition(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: RecipeEvaluationQueryDto,
  ): Promise<RecipeNutritionResponseDto> {
    if (this.recipeNutritionService == null) throw new Error('Recipe nutrition service is not configured.');
    return RecipeNutritionResponseMapper.toDto(await this.recipeNutritionService.calculate(user.sub, id, query.version));
  }

  @Get(':id/ingredients')
  async ingredients(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string): Promise<RecipeResponseDto['versions'][number]['components']> {
    const recipe = await this.recipesService.findById(user.sub, id);
    return (RecipeResponseMapper.toDto(recipe).versions[0]?.components ?? []) as RecipeResponseDto['versions'][number]['components'];
  }

  @Post(':id/add-to-daily-tracker')
  async addToDailyTracker(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddRecipeToDailyTrackerDto,
  ) {
    if (this.dailyTrackerService == null) throw new Error('Daily tracker service is not configured.');
    return this.dailyTrackerService.createRecipeEntry({
      userId: user.sub,
      recipeId: id,
      version: dto.version == null ? undefined : Number(dto.version),
      date: dto.date ?? new Date().toISOString().slice(0, 10),
      servings: dto.servings ?? '1',
    });
  }

  @Get(':id')
  async findById(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string): Promise<RecipeResponseDto> {
    return RecipeResponseMapper.toDto(await this.recipesService.findById(user.sub, id));
  }

  private toWriteInput(dto: CreateRecipeDto): RecipeWriteInput {
    return {
      name: dto.name,
      description: dto.description,
      servings: dto.servings,
      preparationInstructions: dto.preparationInstructions,
      visibility: dto.visibility,
      ingredients: dto.ingredients.map((ingredient) => ({
        foodId: ingredient.foodId,
        servingId: ingredient.servingId,
        quantity: ingredient.quantity,
        unit: ingredient.unit ?? 'SERVING',
        role: ingredient.role ?? 'INGREDIENT',
        notes: ingredient.notes,
      })),
    };
  }
}
