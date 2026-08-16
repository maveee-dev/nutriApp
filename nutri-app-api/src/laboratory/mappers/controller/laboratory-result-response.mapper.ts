import { LaboratoryResultResponseDto } from '../../dto/response/laboratory-result-response.dto.js';
import { LaboratoryResultSource } from '../../sources/laboratory-result.source.js';

export class LaboratoryResultResponseMapper {
  static toResponseDto(source: LaboratoryResultSource): LaboratoryResultResponseDto {
    return {
      id: source.id,
      testCode: source.testCode,
      value: source.value,
      unit: source.unit,
      referenceLow: source.referenceLow,
      referenceHigh: source.referenceHigh,
      collectedAt: source.collectedAt,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
    };
  }
}
