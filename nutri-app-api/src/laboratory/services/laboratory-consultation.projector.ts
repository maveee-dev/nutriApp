import { Injectable } from '@nestjs/common';
import { LaboratoryNutritionInsightSource } from '../sources/laboratory-analysis.source.js';
import { LaboratoryReportService } from './laboratory-report.service.js';

/**
 * Provides consultation with the latest lab-derived educational context.
 * It has no authority over targets, policies, scoring, or treatment advice.
 */
@Injectable()
export class LaboratoryConsultationProjector {
  constructor(private readonly reportService: LaboratoryReportService) {}

  async project(userId: string): Promise<readonly LaboratoryNutritionInsightSource[]> {
    try {
      return (await this.reportService.latest(userId)).nutritionInsights;
    } catch {
      // Consultation remains available when the optional lab projection is
      // temporarily unavailable. Its existing evidence path is unchanged.
      return [];
    }
  }
}
