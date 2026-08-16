import { ActivityLevel, Sex } from '../../../generated/prisma/client.js';

export interface ProfileSource {
  id: string;
  userId: string;
  age: number | null;
  sex: Sex | null;
  heightCm: number | null;
  weightKg: number | null;
  activityLevel: ActivityLevel | null;
  createdAt: Date;
  updatedAt: Date;
}
