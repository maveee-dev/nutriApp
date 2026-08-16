import { Injectable } from '@nestjs/common';
import { NutritionAnalysisRepository } from '../repositories/nutrition-analysis.repository.js';
import { ProfilesRepository } from '../../../profiles/repositories/profiles.repository.js';
import { ConditionsRepository } from '../../../conditions/repositories/conditions.repository.js';
import { DailyNutritionSummarySource } from '../types/daily-nutrition-summary.source.js';
import { NutritionCalculator } from './nutrition-calculator.js';
import { NutritionInsightEngine } from './nutrition-insight-engine.js';
import { NutritionTargetCalculator } from './nutrition-target-calculator.js';
import { LaboratoryResultsService } from '../../../laboratory/services/laboratory-results.service.js';
import { UserDialysisStatusRepository } from '../../../dialysis/repositories/user-dialysis-status.repository.js';
import { WeeklyNutritionSummarySource } from '../types/daily-nutrition-summary.source.js';
import { DialysisStatus } from '../../../../generated/prisma/client.js';
import { ProfileSource } from '../../../profiles/sources/profile.source.js';
import { LaboratoryFindingSource } from '../../../laboratory/sources/laboratory-finding.source.js';

@Injectable()
export class NutritionAnalysisService {
  constructor(
    private readonly repository: NutritionAnalysisRepository,
    private readonly calculator: NutritionCalculator,
    private readonly profilesRepository: ProfilesRepository,
    private readonly conditionsRepository: ConditionsRepository,
    private readonly insightEngine: NutritionInsightEngine,
    private readonly targetCalculator: NutritionTargetCalculator,
    private readonly laboratoryResultsService: LaboratoryResultsService,
    private readonly dialysisStatusRepository: UserDialysisStatusRepository,
  ) {}

  async getDailySummary(userId: string, date: string): Promise<DailyNutritionSummarySource> {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    const meals = await this.repository.findMealsForDateRange(userId, start, end);

    return this.buildDailySummary(date, meals, await this.loadTargetContext(userId));
  }

  async getWeeklySummary(userId: string, startDate: string): Promise<WeeklyNutritionSummarySource> {
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    const meals = await this.repository.findMealsForDateRange(userId, start, end);
    const context = await this.loadTargetContext(userId);
    const days: DailyNutritionSummarySource[] = [];
    for (let offset = 0; offset < 7; offset += 1) {
      const day = new Date(start);
      day.setUTCDate(day.getUTCDate() + offset);
      const date = day.toISOString().slice(0, 10);
      days.push(this.buildDailySummary(
        date,
        meals.filter((meal) => meal.consumedAt.toISOString().slice(0, 10) === date),
        context,
      ));
    }
    return { startDate, endDate: new Date(end.getTime() - 1).toISOString().slice(0, 10), days };
  }

  private buildDailySummary(
    date: string,
    meals: Awaited<ReturnType<NutritionAnalysisRepository['findMealsForDateRange']>>,
    context: TargetContext,
  ): DailyNutritionSummarySource {

    const totals = this.calculator.calculate(meals.flatMap((meal) => meal.items));
    const targetCalculation = this.targetCalculator.calculate(
      context.profile,
      context.conditionCodes,
      context.egfrFinding,
      context.dialysisStatus,
    );
    return {
      date,
      mealCount: meals.length,
      totals,
      targets: targetCalculation.targets,
      insights: this.insightEngine.evaluate(totals, targetCalculation.targets),
      deferredPolicies: targetCalculation.deferredPolicies,
    };
  }

  private async loadTargetContext(userId: string): Promise<TargetContext> {
    const [profile, conditions, egfrFinding, dialysisStatus] = await Promise.all([
      this.profilesRepository.getMyProfile(userId),
      this.conditionsRepository.findUserConditions(userId),
      this.laboratoryResultsService.findLatestEgfr(userId),
      this.dialysisStatusRepository.findByUserId(userId),
    ]);
    return {
      profile,
      conditionCodes: conditions.map(({ condition }) => condition.code),
      egfrFinding,
      dialysisStatus: dialysisStatus?.status ?? null,
    };
  }
}

interface TargetContext {
  readonly profile: Pick<ProfileSource, 'weightKg'> | null;
  readonly conditionCodes: readonly string[];
  readonly egfrFinding: LaboratoryFindingSource | null;
  readonly dialysisStatus: DialysisStatus | null;
}
