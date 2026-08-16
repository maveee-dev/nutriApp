import { LaboratoryResultSource } from '../../sources/laboratory-result.source.js';
import { LaboratoryResultResponseMapper } from './laboratory-result-response.mapper.js';

describe('LaboratoryResultResponseMapper', () => {
  it('maps the raw result without exposing userId', () => {
    const source: LaboratoryResultSource = {
      id: 'result-1',
      userId: 'user-1',
      testCode: 'egfr',
      value: '42.5',
      unit: 'mL/min/1.73m²',
      referenceLow: null,
      referenceHigh: null,
      collectedAt: new Date('2026-08-13T00:00:00.000Z'),
      createdAt: new Date('2026-08-13T01:00:00.000Z'),
      updatedAt: new Date('2026-08-13T01:00:00.000Z'),
    };
    expect(LaboratoryResultResponseMapper.toResponseDto(source)).toEqual({
      id: 'result-1',
      testCode: 'egfr',
      value: '42.5',
      unit: 'mL/min/1.73m²',
      referenceLow: null,
      referenceHigh: null,
      collectedAt: source.collectedAt,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
    });
  });
});
