import type { HealthDashboardInsight } from '../types/health-dashboard.types';
import type { DeferralGuidanceAction } from './deferralGuidance';

export interface DashboardNoticePresentation {
  title: string;
  message: string;
  action?: DeferralGuidanceAction;
}

const action = (label: string, to: string): DeferralGuidanceAction => ({ label, to });
const knownNutrients = ['saturated fat', 'added sugar', 'carbohydrate', 'cholesterol', 'potassium', 'phosphorus', 'sodium', 'protein', 'fiber', 'calories', 'fat'];

const humanize = (value: string): string => value.replaceAll('_', ' ').replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());

/**
 * Converts dashboard notice metadata into patient-facing copy and a precise
 * destination when the missing information can be completed in the app.
 * Unknown notices intentionally keep their copy and have no action link.
 */
export function presentDashboardNotice(notice: HealthDashboardInsight): DashboardNoticePresentation {
  const searchable = `${notice.category} ${notice.title} ${notice.message}`.toLowerCase();

  if (searchable.includes('dialysis') || searchable.includes('modality')) {
    return {
      title: 'Review your dialysis details',
      message: 'Your current dialysis status or treatment type needs to be confirmed before related guidance can be personalized.',
      action: action('Update dialysis details', '/health#dialysis-status'),
    };
  }

  if (notice.source === 'target-configuration' || (searchable.includes('target') && (searchable.includes('configured') || searchable.includes('individualized') || searchable.includes('personal')))) {
    const nutrient = knownNutrients.find((candidate) => searchable.includes(candidate)) ?? (notice.category.trim() || 'nutrition');
    return {
      title: `${humanize(nutrient)} target not set`,
      message: `Your ${nutrient} intake is being tracked, but a personal target has not been added. Add one only if you have guidance from your healthcare team.`,
      action: action('Review nutrition targets', '/nutrition-targets'),
    };
  }

  const laboratoryMatch = ['egfr', 'potassium', 'phosphorus'].find((testCode) => searchable.includes(testCode));
  const looksLikeLaboratoryNotice = notice.source === 'laboratory' || searchable.includes('laboratory') || searchable.includes('lab result') || searchable.includes('laboratory result');
  if (laboratoryMatch && looksLikeLaboratoryNotice) {
    const testName = laboratoryMatch === 'egfr' ? 'eGFR' : laboratoryMatch[0].toUpperCase() + laboratoryMatch.slice(1);
    return {
      title: `Review your ${testName} result`,
      message: `A current ${testName} result helps NutriApp tailor the guidance that applies to you. Add or update it in your Health profile.`,
      action: action(`Review ${testName} results`, `/health?addLab=${laboratoryMatch}#laboratory-results`),
    };
  }

  if (notice.source === 'laboratory') {
    return {
      title: 'Review a lab result',
      message: 'A laboratory result needs your attention. Review your latest results in Health to understand what was recorded and what may need updating.',
      action: action('Review lab results', '/health#laboratory-results'),
    };
  }

  return {
    title: notice.title,
    message: notice.message,
  };
}
