import { Injectable } from '@nestjs/common';
import { Decimal } from 'decimal.js';
import {
  LaboratoryLatestSource,
  LaboratoryNutritionInsightSource,
  LaboratoryReportAnalysisSource,
  LaboratoryResultAnalysisSource,
  LaboratoryResultStatus,
  LaboratoryTrendDirection,
  LaboratoryTrendPointSource,
  LaboratoryTrendSource,
} from '../sources/laboratory-analysis.source.js';
import { LaboratoryReportResultSource, LaboratoryReportSource } from '../sources/laboratory-report.source.js';
import { LABORATORY_TEST_DEFINITIONS } from '../types/laboratory-test-code.js';

/**
 * Deterministic laboratory interpretation and trend projection.
 *
 * This service only describes recorded results relative to the reference range
 * supplied with that result. It does not diagnose, create targets, activate
 * policies, or change compatibility scoring.
 */
@Injectable()
export class LaboratoryAnalysisService {
  analyzeReport(report: LaboratoryReportSource, ignoredTestCodes: readonly string[] = []): LaboratoryReportAnalysisSource {
    const results = report.results
      .filter((result) => this.isSupported(result.testCode))
      .sort((left, right) => left.testCode.localeCompare(right.testCode) || left.id.localeCompare(right.id))
      .map((result) => this.analyzeResult(result, report.reportDate));

    return {
      id: report.id,
      reportDate: report.reportDate,
      source: report.source,
      createdAt: report.createdAt,
      results,
      nutritionInsights: results.flatMap((result) => this.insightFor(result)),
      ignoredTestCodes: [...ignoredTestCodes].sort(),
    };
  }

  analyzeReports(reports: readonly LaboratoryReportSource[]): LaboratoryReportAnalysisSource[] {
    return reports.map((report) => this.analyzeReport(report));
  }

  latest(reports: readonly LaboratoryReportSource[]): LaboratoryLatestSource {
    const latestByCode = new Map<string, LaboratoryResultAnalysisSource>();
    for (const report of reports) {
      const analyzed = this.analyzeReport(report);
      for (const result of analyzed.results) {
        if (!latestByCode.has(result.testCode)) latestByCode.set(result.testCode, result);
      }
    }
    const results = [...latestByCode.values()].sort((left, right) => left.testCode.localeCompare(right.testCode));
    return {
      results,
      nutritionInsights: results.flatMap((result) => this.insightFor(result)),
    };
  }

  trends(reports: readonly LaboratoryReportSource[]): LaboratoryTrendSource[] {
    const byCode = new Map<string, Array<{ result: LaboratoryReportResultSource; report: LaboratoryReportSource }>>();
    for (const report of reports) {
      for (const result of report.results) {
        if (!this.isSupported(result.testCode)) continue;
        const values = byCode.get(result.testCode) ?? [];
        values.push({ result, report });
        byCode.set(result.testCode, values);
      }
    }

    return [...byCode.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([testCode, values]) => {
        const points = values
          .sort((left, right) => this.compareResults(left, right))
          .map(({ result, report }) => this.toTrendPoint(result, report.reportDate));
        const latest = points[points.length - 1];
        const previous = points.length > 1 ? points[points.length - 2] : null;
        return {
          testCode,
          testName: this.testName(testCode),
          direction: this.direction(previous, latest),
          latest,
          previous,
          points,
        };
      });
  }

  private analyzeResult(result: LaboratoryReportResultSource, reportDate: Date): LaboratoryResultAnalysisSource {
    const status = this.status(result);
    return {
      id: result.id,
      reportId: result.reportId,
      testCode: result.testCode,
      testName: result.testName?.trim() || this.testName(result.testCode),
      value: result.value,
      unit: result.unit,
      referenceLow: result.referenceLow,
      referenceHigh: result.referenceHigh,
      flag: result.flag,
      status,
      message: this.message(result, status),
      reportDate,
    };
  }

  private status(result: LaboratoryReportResultSource): LaboratoryResultStatus {
    if (result.referenceLow == null && result.referenceHigh == null) return 'unknown';
    const value = this.decimal(result.value);
    const low = result.referenceLow == null ? null : this.decimal(result.referenceLow);
    const high = result.referenceHigh == null ? null : this.decimal(result.referenceHigh);
    if (value == null || (low == null && high == null)) return 'unknown';
    if (low != null && value.lt(low)) return 'low';
    if (high != null && value.gt(high)) return 'high';
    return 'normal';
  }

  private message(result: LaboratoryReportResultSource, status: LaboratoryResultStatus): string {
    const name = result.testName?.trim() || this.testName(result.testCode);
    if (status === 'high') return `Your ${name} result is above the laboratory reference range.`;
    if (status === 'low') return `Your ${name} result is below the laboratory reference range.`;
    if (status === 'normal') return `Your ${name} result is within the laboratory reference range provided.`;
    return `A laboratory reference range was not provided for this ${name} result, so it could not be classified.`;
  }

  private insightFor(result: LaboratoryResultAnalysisSource): LaboratoryNutritionInsightSource[] {
    if (result.status === 'normal') return [];
    const name = result.testName;
    const message = result.status === 'unknown'
      ? `${name} is recorded as clinical evidence, but NutriApp could not compare it with a reference range. Laboratory results do not create dietary limits or change food compatibility scoring by themselves.`
      : `${name} is ${result.status === 'high' ? 'above' : 'below'} the laboratory reference range. This result may be useful context for nutrition discussions, but NutriApp does not create dietary limits or change food compatibility scoring from a laboratory result alone. Review it with your healthcare provider.`;
    return [{
      category: result.testCode,
      severity: 'information',
      title: `${name} review`,
      message,
      evidence: {
        testCode: result.testCode,
        value: result.value,
        unit: result.unit,
        status: result.status,
      },
    }];
  }

  private toTrendPoint(result: LaboratoryReportResultSource, reportDate: Date): LaboratoryTrendPointSource {
    const analyzed = this.analyzeResult(result, reportDate);
    return {
      resultId: analyzed.id,
      reportDate: analyzed.reportDate,
      value: analyzed.value,
      unit: analyzed.unit,
      status: analyzed.status,
    };
  }

  private direction(previous: LaboratoryTrendPointSource | null, latest: LaboratoryTrendPointSource): LaboratoryTrendDirection {
    if (previous == null) return 'insufficient-history';
    if (latest.status === 'normal' && previous.status !== 'normal') return 'improving';
    if (latest.status !== 'normal' && previous.status === 'normal') return 'worsening';
    return 'stable';
  }

  private compareResults(
    left: { result: LaboratoryReportResultSource; report: LaboratoryReportSource },
    right: { result: LaboratoryReportResultSource; report: LaboratoryReportSource },
  ): number {
    const dateDifference = left.report.reportDate.getTime() - right.report.reportDate.getTime();
    if (dateDifference !== 0) return dateDifference;
    const createdDifference = left.result.createdAt.getTime() - right.result.createdAt.getTime();
    if (createdDifference !== 0) return createdDifference;
    return left.result.id.localeCompare(right.result.id);
  }

  private isSupported(testCode: string): boolean {
    return Object.prototype.hasOwnProperty.call(LABORATORY_TEST_DEFINITIONS, testCode);
  }

  private testName(testCode: string): string {
    return LABORATORY_TEST_DEFINITIONS[testCode as keyof typeof LABORATORY_TEST_DEFINITIONS]?.label ?? testCode;
  }

  private decimal(value: string): Decimal | null {
    try {
      const decimal = new Decimal(value);
      return decimal.isFinite() ? decimal : null;
    } catch {
      return null;
    }
  }
}
