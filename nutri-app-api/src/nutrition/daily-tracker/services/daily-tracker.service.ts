import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { CanonicalCalculationKernel } from '../../calculation/index.js';
import { NutritionCalculator } from '../../analysis/services/nutrition-calculator.js';
import { NutritionTargetService } from '../../targets/services/nutrition-target.service.js';
import { RecipeCalculator } from '../../recipes/services/recipe-calculator.js';
import type { NutritionTargetManagementSource } from '../../targets/types/nutrition-target-management.type.js';
import { DailyTrackerRepository } from '../repositories/daily-tracker.repository.js';
import type { CreateDailyNutritionEntryInput, CreateDailyRecipeEntryInput, UpdateDailyNutritionEntryInput } from '../types/daily-tracker.input.js';
import type {
  DailyNutritionLogSource,
  DailyNutritionTargetSource,
  DailyNutritionTotalsSource,
} from '../types/daily-tracker.source.js';

const TARGET_TO_TOTAL_KEY: Readonly<Record<string, string>> = {
  caloriesKcal: 'calories',
  proteinGrams: 'protein',
  carbohydrateGrams: 'carbohydrates',
  saturatedFatGrams: 'saturatedFat',
  addedSugarGrams: 'addedSugar',
  fiberGrams: 'fiber',
  sodiumMilligrams: 'sodium',
  potassiumMilligrams: 'potassium',
  phosphorusMilligrams: 'phosphorus',
  cholesterolMilligrams: 'cholesterol',
};

@Injectable()
export class DailyTrackerService {
  private readonly calculator = new NutritionCalculator();
  private readonly kernel = new CanonicalCalculationKernel();

  constructor(
    private readonly repository: DailyTrackerRepository,
    private readonly targetService: NutritionTargetService,
    @Optional() private readonly recipeCalculator?: RecipeCalculator,
  ) {}

  getToday(userId: string): Promise<DailyNutritionLogSource> {
    return this.getByDate(userId, this.todayKey());
  }

  async getByDate(userId: string, date: string): Promise<DailyNutritionLogSource> {
    this.toDate(date);
    const log = await this.repository.findByUserAndDate(userId, this.toDate(date));
    return this.buildLog(userId, date, log?.entries ?? []);
  }

  async createEntry(input: CreateDailyNutritionEntryInput): Promise<DailyNutritionLogSource> {
    if (input.foodId == null && input.recipeId != null) {
      return this.createRecipeEntry({
        userId: input.userId,
        date: input.date,
        recipeId: input.recipeId,
        servings: input.servings,
        recipeVersionId: input.recipeVersionId,
      });
    }
    if (input.foodId == null || input.servingId == null) throw new BadRequestException('A food and serving are required for a food entry.');
    const date = input.date || this.todayKey();
    this.toDate(date);
    this.validatePositiveDecimal(input.servings, 'servings');

    const serving = await this.repository.findServingForFood(input.foodId, input.servingId);
    if (serving == null) throw new NotFoundException('Food serving not found.');

    await this.repository.createEntry(
      { ...input, date },
      serving.food.name,
      serving.name,
    );
    return this.getByDate(input.userId, date);
  }

  async createRecipeEntry(input: CreateDailyRecipeEntryInput): Promise<DailyNutritionLogSource> {
    this.validatePositiveDecimal(input.servings, 'servings');
    this.toDate(input.date);
    const version = await this.repository.findRecipeVersionForUser(input.userId, input.recipeId, input.version, input.recipeVersionId);
    if (version == null) throw new NotFoundException('Recipe not found.');
    await this.repository.createEntry(
      {
        userId: input.userId,
        date: input.date,
        recipeId: input.recipeId,
        recipeVersionId: version.id,
        servings: input.servings,
      },
      version.name,
      `1 serving (${version.yieldServings.toString()} recipe servings)`,
    );
    return this.getByDate(input.userId, input.date);
  }

  async updateEntry(userId: string, id: string, input: UpdateDailyNutritionEntryInput): Promise<DailyNutritionLogSource> {
    this.validatePositiveDecimal(input.servings, 'servings');
    const entry = await this.repository.findEntryByIdForUser(id, userId);
    if (entry == null) throw new NotFoundException('Daily nutrition entry not found.');

    const updated = await this.repository.updateEntry(id, userId, input);
    if (updated == null) throw new NotFoundException('Daily nutrition entry not found.');
    return this.getByDate(userId, entry.date);
  }

  async deleteEntry(userId: string, id: string): Promise<void> {
    const entry = await this.repository.findEntryByIdForUser(id, userId);
    if (entry == null || !(await this.repository.deleteEntry(id, userId))) {
      throw new NotFoundException('Daily nutrition entry not found.');
    }
  }

  private async buildLog(
    userId: string,
    date: string,
    entries: DailyNutritionLogSource['entries'],
  ): Promise<DailyNutritionLogSource> {
    const displayEntries = this.recipeCalculator == null
      ? entries
      : await Promise.all(entries.map(async (entry) => {
        if (entry.recipeVersion == null) return entry;
        const nutrition = await this.recipeCalculator!.calculate(entry.recipeVersion);
        return { ...entry, servingGrams: nutrition.servingGrams };
      }));
    const recipeEntries = displayEntries.filter((entry) => entry.recipeVersion != null);
    const foodTotals = this.calculator.calculate(displayEntries.filter((entry) => entry.recipeVersion == null).filter((entry) => entry.foodId != null && entry.servingId != null).map((entry) => ({
      id: entry.id,
      quantity: entry.servings,
      servingGrams: entry.servingGrams,
      nutrients: entry.nutrients,
    })));
    const recipeResults = this.recipeCalculator == null
      ? []
      : await Promise.all(recipeEntries.map((entry) => this.recipeCalculator!.calculate(entry.recipeVersion!, entry.servings)));
    const totals = this.toTotals(recipeResults.length === 0
      ? foodTotals
      : this.kernel.aggregateContributions([
        ...foodTotals.map((total) => ({ nutrientKey: total.name, name: total.name, unit: total.unit, amount: total.amount })),
        ...recipeResults.flatMap((result) => result.nutrients),
      ], [], 'input').contributions.map(({ name, unit, amount }) => ({ name, unit, amount })));
    const targets = await this.toTargets(userId, date, entries.length, totals);
    return { date, entries: displayEntries, totals, targets };
  }

  private toTotals(totals: readonly { name: string; unit: string; amount: string }[]): DailyNutritionTotalsSource {
    const result: Record<string, { amount: string; unit: string }> = {};
    for (const total of totals) {
      const key = this.nutrientKey(total.name, total.unit);
      if (result[key] == null) result[key] = { amount: total.amount, unit: total.unit };
    }
    return result;
  }

  private async toTargets(
    userId: string,
    date: string,
    entryCount: number,
    totals: DailyNutritionTotalsSource,
  ): Promise<Readonly<Record<string, DailyNutritionTargetSource>>> {
    const activeTargets = await this.targetService.active(userId, this.toDate(date));
    const result: Record<string, DailyNutritionTargetSource> = {};
    for (const target of activeTargets) {
      const key = TARGET_TO_TOTAL_KEY[target.nutrient];
      if (key == null) continue;
      const total = totals[key];
      const current = total?.amount ?? (entryCount === 0 ? '0' : null);
      result[key] = this.compareTarget(target, current);
    }
    return result;
  }

  private compareTarget(target: NutritionTargetManagementSource, current: string | null): DailyNutritionTargetSource {
    if (target.value == null || current == null) {
      return {
        current,
        target: target.value,
        remaining: null,
        percentageConsumed: null,
        unit: this.displayUnit(target.unit),
        kind: target.kind,
        status: 'not-configured',
        rangeMin: target.rangeMin,
        rangeMax: target.rangeMax,
        source: target.source,
        approvalStatus: target.approvalStatus,
      };
    }

    const consumed = new Decimal(current);
    const limit = new Decimal(target.value);
    const percentageConsumed = limit.isZero() ? null : consumed.div(limit).mul(100).toDecimalPlaces(2).toNumber();
    const upperLimit = target.kind === 'UPPER_LIMIT';
    const remaining = upperLimit
      ? limit.minus(consumed)
      : Decimal.max(limit.minus(consumed), 0);
    const status = upperLimit
      ? consumed.lte(limit) ? 'within-target' : 'over-limit'
      : consumed.gte(limit) ? 'target-met' : 'below-target';

    return {
      current,
      target: target.value,
      remaining: remaining.toString(),
      percentageConsumed,
      unit: this.displayUnit(target.unit),
      kind: target.kind,
      status,
      rangeMin: target.rangeMin,
      rangeMax: target.rangeMax,
      source: target.source,
      approvalStatus: target.approvalStatus,
    };
  }

  private nutrientKey(name: string, unit: string): string {
    const normalized = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');
    if (normalized === 'energy' || normalized.startsWith('energy ') || normalized.includes('calorie')) return 'calories';
    if (normalized.startsWith('protein')) return 'protein';
    if (normalized.startsWith('carbohydrate')) return 'carbohydrates';
    if (normalized === 'fat' || normalized.startsWith('total lipid')) return 'fat';
    if (normalized.includes('saturated')) return 'saturatedFat';
    if (normalized.includes('added') && normalized.includes('sugar')) return 'addedSugar';
    if (normalized.includes('fiber')) return 'fiber';
    if (normalized.startsWith('sodium')) return 'sodium';
    if (normalized.startsWith('potassium')) return 'potassium';
    if (normalized.startsWith('phosphorus')) return 'phosphorus';
    if (normalized.startsWith('cholesterol')) return 'cholesterol';
    return normalized.replace(/\s+(.)/g, (_match, character: string) => character.toUpperCase()) || unit.toLowerCase();
  }

  private displayUnit(unit: string): string {
    return unit.replace(/\/day$/i, '');
  }

  private todayKey(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private toDate(date: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new BadRequestException('date must use YYYY-MM-DD format.');
    const parsed = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
      throw new BadRequestException('date must be a valid calendar date.');
    }
    return parsed;
  }

  private validatePositiveDecimal(value: string, label: string): void {
    try {
      const decimal = new Decimal(value);
      if (!decimal.isFinite() || decimal.lte(0)) throw new Error('invalid');
    } catch {
      throw new BadRequestException(`${label} must be a positive number.`);
    }
  }

}
