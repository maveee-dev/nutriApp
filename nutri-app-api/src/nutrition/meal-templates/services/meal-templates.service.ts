import { Injectable } from '@nestjs/common';
import { MealTemplateNotFoundError } from '../errors/meal-template-not-found.error.js';
import { MealTemplatesRepository } from '../repositories/meal-templates.repository.js';
import type { MealTemplateSource } from '../types/meal-template.source.js';

@Injectable()
export class MealTemplatesService {
  constructor(private readonly repository: MealTemplatesRepository) {}

  findMany(userId: string): Promise<MealTemplateSource[]> {
    return this.repository.findManyVisibleToUser(userId);
  }

  async findById(userId: string, id: string): Promise<MealTemplateSource> {
    const template = await this.repository.findByIdVisibleToUser(userId, id);
    if (template == null) throw new MealTemplateNotFoundError();
    return template;
  }
}
