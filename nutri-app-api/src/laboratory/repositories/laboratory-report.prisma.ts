import { Prisma } from '../../../generated/prisma/client.js';

export type LaboratoryReportWithResultsRow = Prisma.LaboratoryReportGetPayload<{
  include: { results: true };
}>;
