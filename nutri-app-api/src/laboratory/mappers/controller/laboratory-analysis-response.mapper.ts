import {
  LaboratoryLatestResponseDto,
  LaboratoryNutritionInsightDto,
  LaboratoryReportResponseDto,
  LaboratoryResultAnalysisDto,
  LaboratoryTrendDto,
  LaboratoryTrendPointDto,
} from '../../dto/response/laboratory-analysis-response.dto.js';
import {
  LaboratoryLatestSource,
  LaboratoryNutritionInsightSource,
  LaboratoryReportAnalysisSource,
  LaboratoryResultAnalysisSource,
  LaboratoryTrendPointSource,
  LaboratoryTrendSource,
} from '../../sources/laboratory-analysis.source.js';

export class LaboratoryAnalysisResponseMapper {
  static report(source: LaboratoryReportAnalysisSource): LaboratoryReportResponseDto {
    return {
      id: source.id,
      reportDate: source.reportDate.toISOString().slice(0, 10),
      source: source.source,
      createdAt: source.createdAt.toISOString(),
      results: source.results.map((result) => this.result(result)),
      nutritionInsights: source.nutritionInsights.map((insight) => this.insight(insight)),
      ignoredTestCodes: [...source.ignoredTestCodes],
    };
  }

  static latest(source: LaboratoryLatestSource): LaboratoryLatestResponseDto {
    return {
      results: source.results.map((result) => this.result(result)),
      nutritionInsights: source.nutritionInsights.map((insight) => this.insight(insight)),
    };
  }

  static trends(sources: readonly LaboratoryTrendSource[]): LaboratoryTrendDto[] {
    return sources.map((source) => ({
      testCode: source.testCode,
      testName: source.testName,
      direction: source.direction,
      latest: this.point(source.latest),
      previous: source.previous == null ? null : this.point(source.previous),
      points: source.points.map((point) => this.point(point)),
    }));
  }

  private static result(source: LaboratoryResultAnalysisSource): LaboratoryResultAnalysisDto {
    return {
      id: source.id,
      reportId: source.reportId,
      testCode: source.testCode,
      testName: source.testName,
      value: source.value,
      unit: source.unit,
      referenceLow: source.referenceLow,
      referenceHigh: source.referenceHigh,
      flag: source.flag,
      status: source.status,
      message: source.message,
      reportDate: source.reportDate.toISOString().slice(0, 10),
    };
  }

  private static insight(source: LaboratoryNutritionInsightSource): LaboratoryNutritionInsightDto {
    return { ...source, evidence: { ...source.evidence } };
  }

  private static point(source: LaboratoryTrendPointSource): LaboratoryTrendPointDto {
    return {
      resultId: source.resultId,
      reportDate: source.reportDate.toISOString().slice(0, 10),
      value: source.value,
      unit: source.unit,
      status: source.status,
    };
  }
}
