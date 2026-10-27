import { z } from 'zod';
import { addDays, PLAN_LENGTHS } from './plans.lib.ts';

// Form schemas, apart from plans.lib.ts: that module loads on every page (plan sync),
// and zod should only load with the forms.

/**
 * The new-plan form: a length in days, or "by a date" with that date. It
 * turns into the plan's end date, which can't be before today.
 */
export function newPlanSchema(today: string) {
  return z
    .object({ length: z.union([z.literal(PLAN_LENGTHS), z.literal('date')]), date: z.iso.date() })
    .transform(({ length, date }) => (length === 'date' ? date : addDays(today, length - 1)))
    .refine((endDate) => endDate >= today);
}

/**
 * Moving a plan's end date: any day from today on.
 */
export function endDateSchema(today: string) {
  return z.object({ date: z.iso.date().refine((date) => date >= today) });
}
