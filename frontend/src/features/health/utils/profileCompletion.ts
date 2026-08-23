import type { NutritionPolicyDeferral } from '@/features/dashboard/types/dashboard.types';
import { deferralGuidance, type DeferralGuidanceAction } from '@/features/dashboard/utils/deferralGuidance';
import type { LaboratoryResult, UserDialysisStatus, UserProfile } from '../types/health.types';

export type ProfileCompletionStatus = 'complete' | 'attention' | 'informational';

export interface ProfileCompletionItem {
  id: string;
  label: string;
  detail: string;
  status: ProfileCompletionStatus;
  action?: DeferralGuidanceAction;
}

export interface ProfileCompletionInput {
  profile: UserProfile | null;
  conditionCount: number;
  dialysisStatus: UserDialysisStatus | null;
  laboratoryResults: LaboratoryResult[];
  deferredPolicies: NutritionPolicyDeferral[];
}

const LAB_REASON_TO_CODE: Record<string, 'egfr' | 'potassium' | 'phosphorus'> = {
  'missing-egfr': 'egfr',
  'stale-egfr': 'egfr',
  'invalid-egfr-unit': 'egfr',
  'invalid-egfr-value': 'egfr',
  'unsupported-egfr': 'egfr',
  'missing-potassium': 'potassium',
  'stale-potassium': 'potassium',
  'invalid-potassium-unit': 'potassium',
  'invalid-potassium-value': 'potassium',
  'missing-phosphorus': 'phosphorus',
  'stale-phosphorus': 'phosphorus',
  'invalid-phosphorus-unit': 'phosphorus',
  'invalid-phosphorus-value': 'phosphorus',
};

const dialysisReasons = new Set([
  'missing-dialysis-status',
  'stale-dialysis-evidence',
  'missing-dialysis-modality',
  'conflicting-dialysis-modality',
]);

const ignoredHealthSummaryReasons = new Set([
  'insufficient-historical-coverage',
  'missing-replay-fingerprint',
  'mixed-evaluator-versions',
  'mixed-policy-set-fingerprints',
  'mixed-resolved-rules',
]);

export function buildProfileCompletionItems(input: ProfileCompletionInput): ProfileCompletionItem[] {
  const items: ProfileCompletionItem[] = [
    {
      id: 'age',
      label: 'Age',
      detail: input.profile?.age == null ? 'Add your age so guidance can be personalized.' : input.profile.age + ' years recorded.',
      status: input.profile?.age == null ? 'attention' : 'complete',
      action: input.profile?.age == null ? { label: 'Add age', to: '/health#physical-metrics' } : undefined,
    },
    {
      id: 'sex',
      label: 'Biological sex',
      detail: input.profile?.sex == null ? 'Add this information to support applicable target calculations.' : 'Recorded.',
      status: input.profile?.sex == null ? 'attention' : 'complete',
      action: input.profile?.sex == null ? { label: 'Add biological sex', to: '/health#physical-metrics' } : undefined,
    },
    {
      id: 'height',
      label: 'Height',
      detail: input.profile?.heightCm == null ? 'Add your height for personalized guidance.' : input.profile.heightCm + ' cm recorded.',
      status: input.profile?.heightCm == null ? 'attention' : 'complete',
      action: input.profile?.heightCm == null ? { label: 'Add height', to: '/health#physical-metrics' } : undefined,
    },
    {
      id: 'weight',
      label: 'Body weight',
      detail: input.profile?.weightKg == null ? 'Add your current weight for personalized targets.' : input.profile.weightKg + ' kg recorded.',
      status: input.profile?.weightKg == null ? 'attention' : 'complete',
      action: input.profile?.weightKg == null ? { label: 'Add body weight', to: '/health#physical-metrics' } : undefined,
    },
  ];

  items.push({
    id: 'conditions',
    label: 'Health conditions',
    detail: input.conditionCount > 0
      ? input.conditionCount + ' condition' + (input.conditionCount === 1 ? '' : 's') + ' reported.'
      : 'No conditions reported yet. Add any diagnosed conditions so guidance can reflect them.',
    status: input.conditionCount > 0 ? 'complete' : 'informational',
    action: input.conditionCount === 0 ? { label: 'Review conditions', to: '/health#health-conditions' } : undefined,
  });

  const dialysisDeferral = input.deferredPolicies.find((policy) => dialysisReasons.has(policy.reason));
  if (dialysisDeferral) {
    const guidance = deferralGuidance(dialysisDeferral);
    items.push({
      id: 'dialysis',
      label: 'Dialysis treatment details',
      detail: guidance.supportingText ?? dialysisDeferral.explanation,
      status: 'attention',
      action: guidance.action,
    });
  } else {
    items.push({
      id: 'dialysis',
      label: 'Dialysis treatment details',
      detail: input.dialysisStatus == null ? 'No dialysis treatment is required by current guidance.' : 'Dialysis treatment status recorded.',
      status: 'informational',
      action: undefined,
    });
  }

  const labDeferrals = input.deferredPolicies.filter((policy) => LAB_REASON_TO_CODE[policy.reason] != null);
  const labCodes = [...new Set(labDeferrals.map((policy) => LAB_REASON_TO_CODE[policy.reason]))];
  if (labCodes.length > 0) {
    for (const code of labCodes) {
      const deferral = labDeferrals.find((policy) => LAB_REASON_TO_CODE[policy.reason] === code);
      if (!deferral) continue;
      const guidance = deferralGuidance(deferral);
      const label = code === 'egfr' ? 'eGFR laboratory evidence' : code === 'potassium' ? 'Potassium laboratory evidence' : 'Phosphorus laboratory evidence';
      items.push({
        id: 'lab-' + code,
        label,
        detail: deferral.explanation,
        status: 'attention',
        action: guidance.action,
      });
    }
  } else {
    items.push({
      id: 'laboratory',
      label: 'Laboratory evidence',
      detail: input.laboratoryResults.length > 0
        ? input.laboratoryResults.length + ' laboratory result' + (input.laboratoryResults.length === 1 ? '' : 's') + ' recorded.'
        : 'No laboratory evidence is currently requested by active guidance.',
      status: input.laboratoryResults.length > 0 ? 'complete' : 'informational',
      action: input.laboratoryResults.length === 0 ? { label: 'Review laboratory results', to: '/health#laboratory-results' } : undefined,
    });
  }

  const otherDeferral = input.deferredPolicies.find((policy) => (
    !LAB_REASON_TO_CODE[policy.reason]
    && !dialysisReasons.has(policy.reason)
    && !ignoredHealthSummaryReasons.has(policy.reason)
  ));
  if (otherDeferral) {
    const guidance = deferralGuidance(otherDeferral);
    items.push({
      id: 'additional-guidance',
      label: 'Additional guidance requirements',
      detail: guidance.supportingText ?? otherDeferral.explanation,
      status: 'attention',
      action: guidance.action,
    });
  }

  return items;
}
