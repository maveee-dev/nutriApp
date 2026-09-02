import type { DailyNutritionSummarySource } from '../../analysis/types/daily-nutrition-summary.source.js';
import type { NutritionPolicyDeferralSource } from '../../analysis/types/nutrition-targets.type.js';
import type { MealContextAvailability } from '../types/meal-context-availability.type.js';

export interface ConsultationFallbackGuidanceInput {
  readonly question: string;
  readonly intent: string;
  readonly summary: DailyNutritionSummarySource;
  readonly mealContext: MealContextAvailability;
}

export type ConsultationGuidanceSectionKey =
  | 'introduction'
  | 'foods-to-eat'
  | 'foods-to-limit'
  | 'tips'
  | 'personalization'
  | 'why'
  | 'next-step';

export interface ConsultationGuidanceSection {
  readonly key: ConsultationGuidanceSectionKey;
  readonly title: string;
  readonly items: readonly string[];
  readonly format?: 'paragraphs' | 'bullets';
}

export interface ConsultationFallbackGuidanceSections {
  readonly introduction: string;
  readonly generalSections: readonly ConsultationGuidanceSection[];
  readonly limitationSections: readonly ConsultationGuidanceSection[];
  readonly generalGuidance: string;
  readonly limitations: string;
}

interface GuidanceNotice {
  readonly unavailable: string;
  readonly why?: string;
  readonly nextStep?: string;
}

/**
 * Builds deterministic, patient-facing consultation language when a fully
 * personalized answer is not available. It presents existing results and
 * limitations; it never creates targets or clinical decisions.
 */
export class ConsultationFallbackGuidanceBuilder {
  build(input: ConsultationFallbackGuidanceInput): string {
    const sections = this.buildSections(input);
    return [sections.generalGuidance, sections.limitations].filter(Boolean).join('\n\n');
  }

  buildSections(input: ConsultationFallbackGuidanceInput): ConsultationFallbackGuidanceSections {
    const introduction = this.introduction(input);
    const generalSections = this.generalSections(input);
    const limitationSections = this.buildLimitationSections(input);

    return {
      introduction: introduction.items.join('\n'),
      generalSections,
      limitationSections,
      generalGuidance: renderGuidanceSections([introduction, ...generalSections]),
      limitations: renderGuidanceSections(limitationSections),
    };
  }

  buildLimitations(input: ConsultationFallbackGuidanceInput): string {
    return renderGuidanceSections(this.buildLimitationSections(input));
  }

  private buildLimitationSections(input: ConsultationFallbackGuidanceInput): readonly ConsultationGuidanceSection[] {
    const policyText = [
      ...(input.summary.targetProvenance ?? []).map((item) => item.applicability?.conditionCode ?? ''),
      ...input.summary.deferredPolicies.map((item) => item.policyId),
    ].join(' ').toLowerCase();
    const notices = this.conditionNotices(input.question, policyText);
    if (this.shouldExplainMissingInformation(input)) {
      notices.push(...this.deferralNotices(input.summary.deferredPolicies));
    }

    if (input.mealContext === 'unavailable') {
      notices.push({
        unavailable: 'I can\'t comment on today\'s progress until a meal is logged.',
        why: 'A meal log gives me the intake needed to compare your day with your goals.',
        nextStep: 'Add your next meal in Meals.',
      });
    }

    if (notices.length === 0) return [];

    const unavailable = unique(notices.map(({ unavailable }) => unavailable));
    const reasons = unique(notices.map(({ why }) => why).filter((value): value is string => value != null));
    const nextSteps = unique(notices.map(({ nextStep }) => nextStep).filter((value): value is string => value != null));
    const sections: ConsultationGuidanceSection[] = [{
      key: 'personalization',
      title: '',
      format: 'paragraphs',
      items: [`I can already give general guidance, but ${unavailable.join(' ')}`],
    }];

    if (reasons.length > 0 && this.asksForReason(input.question)) sections.push({ key: 'why', title: 'Why does this matter?', items: reasons });
    if (nextSteps.length > 0 && this.asksForNextStep(input.question)) sections.push({ key: 'next-step', title: '➡ Next step', items: nextSteps });
    return sections;
  }

  private introduction(input: ConsultationFallbackGuidanceInput): ConsultationGuidanceSection {
    const normalized = input.question.toLowerCase();
    if (input.intent === 'daily-improvement') {
      return {
        key: 'introduction',
        title: '',
        format: 'paragraphs',
        items: ['I can help you see how today\'s meals fit your goals. Log meals and portions as you go so the picture becomes more useful.'],
      };
    }
    if (input.intent === 'laboratory-evidence') {
      return {
        key: 'introduction',
        title: '',
        format: 'paragraphs',
        items: ['Your lab results can help explain why certain nutrition guidance applies to you. I can show which recorded results were available and how they contributed to your guidance.'],
      };
    }

    const nutrientGuidance = this.nutrientSections(normalized);
    if (nutrientGuidance != null) {
      const first = nutrientGuidance[0];
      const nutrientIntro: Record<string, string> = {
        'About sodium': 'Sodium is something your body needs, but too much can make fluid balance and blood pressure harder to manage. Here are a few practical ways to think about it.',
        'About potassium': 'Potassium supports important nerve and muscle functions. The right amount depends on your kidney health, laboratory results, and treatment, so here are safe principles to start with.',
        'About phosphorus': 'Phosphorus supports bones and other body functions. People with kidney disease may need different amounts, so here are safe principles to start with.',
        'A helpful tip': 'Protein and carbohydrate foods can both be part of a balanced eating pattern. The right amounts depend on your goals and medical needs, so here is a practical starting point.',
      };
      return {
        key: 'introduction',
        title: '',
        format: 'paragraphs',
        items: [nutrientIntro[first.title] ?? 'Here is a practical way to think about this nutrition question.'],
      };
    }

    const contexts = this.contextKeys(input);
    if (contexts.includes('ckd')) {
      return {
        key: 'introduction',
        title: '',
        format: 'paragraphs',
        items: ['For someone with CKD, there usually are not many foods that are completely off-limits. A good starting point is to choose less processed foods and keep sodium modest. I can make the guidance more personal as I learn more about your health and treatment.'],
      };
    }
    if (contexts.includes('diabetes')) {
      return {
        key: 'introduction',
        title: '',
        format: 'paragraphs',
        items: ['For diabetes, a helpful starting point is to build meals around vegetables, fiber-rich foods, and balanced portions of carbohydrate foods. Water or unsweetened drinks can help keep added sugar lower.'],
      };
    }
    if (contexts.includes('hypertension')) {
      return {
        key: 'introduction',
        title: '',
        format: 'paragraphs',
        items: ['For blood pressure, a helpful starting point is to choose more fresh, minimally processed foods and keep sodium modest. This can support heart health alongside your care plan.'],
      };
    }
    return {
      key: 'introduction',
      title: '',
      format: 'paragraphs',
      items: ['For everyday food choices, a good starting point is a variety of minimally processed foods, balanced portions, and drinks that fit your needs. Here are a few simple ideas to get started.'],
    };
  }

  private asksForReason(question: string): boolean {
    return /\b(why|matter|important|affect|different)\b/i.test(question);
  }

  private asksForNextStep(question: string): boolean {
    return /\b(update|add|record|enter|where|how)\b/i.test(question);
  }

  private shouldExplainMissingInformation(input: ConsultationFallbackGuidanceInput): boolean {
    if (input.intent === 'recommendation' || input.intent === 'recommendation-explanation' || input.intent === 'laboratory-evidence') return true;
    return /\b(my|for me|personal|personalize|ckd|kidney|renal|dialysis|diabetes|blood sugar|glucose|a1c|hba1c|potassium|phosphorus|protein|carbohydrate|fluid|target|goal)\b/i.test(input.question);
  }

  private conditionNotices(question: string, policyText: string): GuidanceNotice[] {
    const normalized = question.toLowerCase();
    const contexts = [
      { key: 'ckd', label: 'CKD', pattern: /(\bckd\b|kidney|renal|dialysis)/ },
      { key: 'diabetes', label: 'diabetes', pattern: /(\bdiabetes\b|blood sugar|glucose|a1c|hba1c)/ },
      { key: 'hypertension', label: 'hypertension', pattern: /(hypertension|blood pressure)/ },
    ];

    return contexts
      .filter(({ pattern }) => pattern.test(normalized))
      .filter(({ key }) => !new RegExp(`\\b${key}\\b`).test(policyText))
      .map(({ label }) => ({
        unavailable: `your ${label} status isn't recorded, so I can't tailor this guidance to your profile yet.`,
        why: 'Recording your health conditions helps NutriApp choose guidance that fits your needs.',
        nextStep: `If applicable, add ${label} in Health > Health Conditions.`,
      }));
  }

  private contextKeys(input: ConsultationFallbackGuidanceInput): string[] {
    const policyText = [
      ...(input.summary.targetProvenance ?? []).map((item) => item.applicability?.conditionCode ?? ''),
      ...input.summary.deferredPolicies.map((item) => item.policyId),
    ].join(' ').toLowerCase();
    const searchableText = `${input.question.toLowerCase()} ${policyText}`;
    const contexts: string[] = [];
    if (/\bckd\b|kidney|renal|dialysis/.test(searchableText)) contexts.push('ckd');
    if (/\bdiabetes\b|blood sugar|glucose|a1c|hba1c/.test(searchableText)) contexts.push('diabetes');
    if (/hypertension|blood pressure/.test(searchableText)) contexts.push('hypertension');
    return contexts;
  }

  private generalSections(input: ConsultationFallbackGuidanceInput): readonly ConsultationGuidanceSection[] {
    const normalized = input.question.toLowerCase();
    if (input.intent === 'daily-improvement') {
      return [{
        key: 'tips',
        title: 'Today',
        items: ['I compare the meals you log with your current goals. Keep logging meals and portions so your progress is easier to understand.'],
      }];
    }
    if (input.intent === 'laboratory-evidence') {
      return [{
        key: 'tips',
        title: 'Your lab results',
        items: ['Current results can help your healthcare team tailor nutrition guidance. Keep them up to date and review them alongside your food and meal information.'],
      }];
    }

    const contexts = this.contextKeys(input);

    const nutrientGuidance = this.nutrientSections(normalized);
    if (nutrientGuidance != null) return nutrientGuidance;

    const guidance = contexts.flatMap((context) => this.contextSections(context));
    const sections = guidance.length > 0 ? mergeSections(guidance) : this.generalFoodSections();
    return this.asksForLimits(input) ? sections.filter((section) => section.key === 'foods-to-limit') : sections;
  }

  private asksForLimits(input: ConsultationFallbackGuidanceInput): boolean {
    return input.intent === 'avoidance-guidance'
      || /\b(avoid|limit|reduce|cut back|stay away|shouldn't|should not)\b/i.test(input.question);
  }

  private contextSections(context: string): readonly ConsultationGuidanceSection[] {
    if (context === 'ckd') {
      return [
        {
          key: 'foods-to-eat',
          title: 'Foods to eat',
          items: [
            'Apples, berries, and fresh vegetables — fresh options are often easier to prepare without added salt, although some choices may need to fit your potassium guidance.',
            'Fresh fish or skinless chicken — useful protein choices that are often lower in sodium than processed meats.',
            'Eggs — a simple protein source that fits many meals.',
            'Rice or oats — provide energy and are naturally low in sodium.',
          ],
        },
        {
          key: 'foods-to-limit',
          title: '⚠ Foods to limit',
          items: ['Processed meats and packaged foods — they often contain large amounts of sodium and preservatives.'],
        },
      ];
    }
    if (context === 'diabetes') {
      return [
        {
          key: 'foods-to-eat',
          title: 'Foods to eat',
          items: [
            'Non-starchy vegetables — add fiber and volume without a large carbohydrate load.',
            'Beans, lentils, and other fiber-rich foods — can help make meals more filling.',
            'Rice, oats, or other carbohydrate foods in balanced portions — provide energy while keeping portions easier to manage.',
            'Water or unsweetened drinks — help keep added sugar lower.',
          ],
        },
        {
          key: 'foods-to-limit',
          title: '⚠ Foods to limit',
          items: ['Sugary drinks and very large portions of refined carbohydrates — they can raise blood sugar quickly.'],
        },
        {
          key: 'tips',
          title: 'Tips',
          items: ['Pair carbohydrate foods with fiber or protein when that fits your goals — this can make a meal more balanced.'],
        },
      ];
    }
    return [
      {
        key: 'foods-to-eat',
        title: 'Foods to eat',
        items: ['Apples, berries, and vegetables — provide fiber and helpful nutrients.', 'Fresh fish or lean chicken — are practical protein choices.', 'Oats, rice, and other whole grains — provide energy and fiber.', 'Lower-sodium meals — can support healthier blood pressure.'],
      },
      {
        key: 'foods-to-limit',
        title: '⚠ Foods to limit',
        items: ['Highly processed foods and sugary drinks — they can add excess sodium, sugar, or saturated fat.'],
      },
    ];
  }

  private generalFoodSections(): readonly ConsultationGuidanceSection[] {
    return [
      {
        key: 'foods-to-eat',
        title: 'Foods to eat',
        items: ['Apples, bananas, and other fruits — provide fiber and naturally occurring nutrients.', 'Vegetables — add color, volume, and fiber to meals.', 'Eggs, fish, chicken, or other appropriate protein foods — can make meals more satisfying.', 'Water or unsweetened drinks — help limit added sugar.'],
      },
      {
        key: 'foods-to-limit',
        title: '⚠ Foods to limit',
        items: ['Heavily processed foods and sugary drinks — they often add extra sodium or sugar.'],
      },
    ];
  }

  private nutrientSections(question: string): readonly ConsultationGuidanceSection[] | null {
    if (/sodium/.test(question) && /(why|important|limit|reduce|lower|high)/.test(question)) {
      return [{
        key: 'tips',
        title: 'About sodium',
        items: ['Sodium is an essential nutrient, but too much can contribute to fluid retention and make blood pressure harder to manage. Choosing more fresh, minimally processed foods and checking labels can help reduce sodium intake.'],
      }];
    }
    if (/potassium/.test(question) && /(why|important|limit|reduce|lower|high)/.test(question)) {
      return [{
        key: 'tips',
        title: 'About potassium',
        items: ['Potassium supports normal nerve and muscle function, but the right amount depends on kidney function, laboratory results, and treatment. Do not make a large potassium restriction without guidance from your healthcare team.'],
      }];
    }
    if (/phosphorus/.test(question) && /(why|important|limit|reduce|lower|high)/.test(question)) {
      return [{
        key: 'tips',
        title: 'About phosphorus',
        items: ['Phosphorus supports bones and other body functions, but people with kidney disease may need personal guidance based on current health information and a goal from their healthcare team.'],
      }];
    }
    if (/(protein|carbohydrate|carb)/.test(question) && /(why|important|target|amount|how much)/.test(question)) {
      return [{
        key: 'tips',
        title: 'A helpful tip',
        items: ['Protein and carbohydrate foods can be part of a balanced eating pattern, but the appropriate amount depends on your health goals and medical needs. Prefer balanced portions and use your active nutrition goals when they are available.'],
      }];
    }
    return null;
  }

  private deferralNotices(deferrals: readonly NutritionPolicyDeferralSource[]): GuidanceNotice[] {
    const notices: GuidanceNotice[] = [];
    const dialysisDeferral = deferrals.find((item) => item.reason.includes('dialysis') || item.policyId.includes('dialysis'));
    if (dialysisDeferral != null) {
      notices.push({
        unavailable: "your dialysis status isn't recorded, so I can't tailor protein, potassium, phosphorus, or fluid guidance yet.",
        why: 'Dialysis status matters because nutrition needs can differ between non-dialysis CKD and dialysis.',
        nextStep: 'Go to Health > Dialysis Status and select your current treatment. If your treatment type is not available there, confirm it with your healthcare team.',
      });
    }

    const laboratoryDeferrals = deferrals.filter((item) =>
      /^(missing|stale|invalid|unsupported)-/.test(item.reason)
      && !item.reason.includes('individualized')
      && !item.reason.includes('target'),
    );
    const laboratoryNames = [...new Set(laboratoryDeferrals.map((item) => laboratoryName(item.reason)).filter((value): value is string => value != null))];
    if (laboratoryNames.length > 0) {
      const status = laboratoryDeferrals.some((item) => item.reason.startsWith('stale-')) ? 'missing, stale, or not usable' : 'not available or not usable';
      notices.push({
        unavailable: `your ${joinHuman(laboratoryNames)} results are ${status}, so I can't use them to tailor this guidance yet.`,
        why: 'These results help determine which guidance is appropriate for you.',
        nextStep: `Add or review ${joinHuman(laboratoryNames)} in Health > Laboratory Results, or discuss them with your healthcare team.`,
      });
    }

    const targetDeferrals = deferrals.filter((item) => /(?:individualized|target)/.test(item.reason));
    const targetNames = [...new Set(targetDeferrals.map((item) => targetName(item.reason)).filter((value): value is string => value != null))];
    if (targetNames.length > 0) {
      notices.push({
        unavailable: `a personal ${joinHuman(targetNames)} goal from your healthcare team isn't available yet, so I can't use it to tailor this guidance.`,
        why: 'A personal goal should come from your healthcare team rather than be inferred from a lab result alone.',
        nextStep: `Review your ${joinHuman(targetNames)} goal in Health > Nutrition Targets. If that field is not available, ask your healthcare team to provide or update it.`,
      });
    }

    if (deferrals.some((item) => item.reason === 'missing-weight')) {
      notices.push({
        unavailable: "your current body weight is missing, so I can't tailor some personal goals yet.",
        why: 'Weight can affect certain nutrition goals.',
        nextStep: 'Add your current weight in Health > Physical Metrics.',
      });
    }

    return notices;
  }
}

export function renderGuidanceSections(sections: readonly ConsultationGuidanceSection[]): string {
  return sections
    .filter((section) => section.items.length > 0)
    .map((section) => {
      const body = section.format === 'paragraphs'
        ? section.items.join('\n')
        : section.items.map((item) => `• ${item}`).join('\n');
      return section.title.length === 0
        ? body
        : `${section.title}${section.title.endsWith('?') ? '' : ':'}\n${body}`;
    })
    .join('\n\n');
}

function laboratoryName(reason: string): string | null {
  const match = reason.match(/(?:missing|stale|invalid|unsupported)-(.+)/);
  const code = match?.[1];
  if (code == null || code.includes('target') || code.includes('dialysis')) return null;
  const names: Record<string, string> = {
    egfr: 'eGFR',
    potassium: 'serum potassium',
    phosphorus: 'serum phosphorus',
    hba1c: 'HbA1c',
    glucose: 'glucose',
  };
  return names[code] ?? code.replaceAll('-', ' ');
}

function targetName(reason: string): string | null {
  const names: Record<string, string> = {
    phosphorus: 'phosphorus',
    carbohydrate: 'carbohydrate',
    protein: 'protein',
    potassium: 'potassium',
    fluid: 'fluid',
  };
  const code = Object.keys(names).find((value) => reason.includes(value));
  if (code != null) return names[code];
  if (reason.includes('individualized') || reason.includes('target')) return 'nutrition';
  return null;
}

function joinHuman(values: readonly string[]): string {
  if (values.length <= 1) return values[0] ?? 'the required information';
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`;
}

function mergeSections(sections: readonly ConsultationGuidanceSection[]): readonly ConsultationGuidanceSection[] {
  const merged = new Map<ConsultationGuidanceSectionKey, ConsultationGuidanceSection>();
  for (const section of sections) {
    const existing = merged.get(section.key);
    if (existing == null) {
      merged.set(section.key, { ...section, items: [...section.items] });
      continue;
    }
    merged.set(section.key, { ...existing, items: unique([...existing.items, ...section.items]) });
  }
  return [...merged.values()];
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}
