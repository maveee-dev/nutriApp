import { ServingResponseDto } from '../../dto/response/serving-response-dto.js';
import { ServingSource } from '../../sources/serving.source.js';

export class ServingResponseMapper {
  static toServingDto(source: ServingSource): ServingResponseDto {
    return {
      id: source.id,
      name: source.name,
      grams: source.grams,
    };
  }
}
