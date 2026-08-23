import { auditFoodPresentationRecords } from './food-presentation-quality-audit.js';
import { formatFoodPresentationQualityReport } from './food-presentation-quality-report.js';

describe('food presentation quality report formatter', () => {
  it('renders the required human-readable sections', () => {
    const report = auditFoodPresentationRecords(
      [
        {
          id: 'nut-1',
          name: 'Nuts, almonds',
          presentation: { displayNameOverride: 'Nut' },
        },
        { id: 'nut-2', name: 'Nuts, almonds' },
      ],
      '2026-01-01T00:00:00.000Z',
    );

    const text = formatFoodPresentationQualityReport(report);

    expect(text).toContain('Summary');
    expect(text).toContain('Presentation quality score:');
    expect(text).toContain('Issue counts by category');
    expect(text).toContain('Top priorities');
    expect(text).toContain('Findings grouped by grammar category');
    expect(text).toContain('Ambiguous duplicate display names');
    expect(text).toContain('Suggested reusable grammar improvements');
    expect(text).toContain('nuts-and-seeds');
  });
});
