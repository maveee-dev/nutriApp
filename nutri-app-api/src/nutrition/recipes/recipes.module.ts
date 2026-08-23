import { Module } from '@nestjs/common';
import { RecipesController } from './controllers/recipes.controller.js';
import { RecipesRepository } from './repositories/recipes.repository.js';
import { RecipesService } from './services/recipes.service.js';

@Module({
  providers: [RecipesRepository, RecipesService],
  exports: [RecipesRepository, RecipesService],
})
export class RecipesModule {}
