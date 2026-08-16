import { Decimal } from 'decimal.js';
import { DialysisStatus } from '../../../../generated/prisma/client.js';
import { CONDITION_CODES } from '../../../conditions/types/condition-code.js';
import { ProfileSource } from '../../../profiles/sources/profile.source.js';
import { LaboratoryFindingSource } from '../../../laboratory/sources/laboratory-finding.source.js';

export class CkdProteinPolicy {
  calculate(
    profile: Pick<ProfileSource, 'weightKg'> | null,
    conditionCodes: readonly string[],
    egfrFinding: LaboratoryFindingSource | null,
    dialysisStatus: DialysisStatus | null,
    baselineProteinGrams: string | null,
  ): string | null {
    if (
      !conditionCodes.includes(CONDITION_CODES.CKD) ||
      profile?.weightKg == null ||
      egfrFinding == null ||
      dialysisStatus !== DialysisStatus.INACTIVE ||
      !this.isSupportedEgfr(egfrFinding.value)
    ) {
      return null;
    }

    // The approved non-dialysis KDIGO value currently matches the baseline.
    return baselineProteinGrams;
  }

  private isSupportedEgfr(value: string): boolean {
    const egfr = new Decimal(value);
    return egfr.gt(0) && egfr.lt(60);
  }
}
