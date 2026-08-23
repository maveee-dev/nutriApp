import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard.js';
import { FoodRecognitionRequestDto } from '../dto/food-recognition-request.dto.js';
import { FoodRecognitionResponseDto } from '../dto/food-recognition-response.dto.js';
import { FoodRecognitionService } from '../services/food-recognition.service.js';

@Controller('nutrition/food-recognition')
@UseGuards(JwtAuthGuard)
export class FoodRecognitionController {
  constructor(private readonly service: FoodRecognitionService) {}

  @Post()
  recognize(@Body() request: FoodRecognitionRequestDto): Promise<FoodRecognitionResponseDto> {
    return this.service.recognize(request);
  }
}
