import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class FoodRecognitionRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(15_000_000)
  imageData!: string;

  @IsString()
  @IsIn(['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
  mimeType!: string;
}
