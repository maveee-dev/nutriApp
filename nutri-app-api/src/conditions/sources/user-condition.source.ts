import { ConditionSource } from './condition.source.js';

export interface UserConditionSource {
  readonly createdAt: Date;
  readonly condition: ConditionSource;
}
