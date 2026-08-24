import { IsEmail, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  email!: string;

  @Matches(/^\d{6}$/)
  code!: string;

  @MinLength(8)
  password!: string;
}
