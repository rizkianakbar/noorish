import { describe, expect, it } from 'vitest';
import { addDays } from './plans.lib.ts';
import { endDateSchema, newPlanSchema } from './plans.schemas.ts';

const START = '2026-10-01';

describe('plan forms', () => {
  it('turns a length or a chosen date into the end date', () => {
    const schema = newPlanSchema(START);
    expect(schema.parse({ length: 30, date: '2026-01-01' })).toBe(addDays(START, 29));
    expect(schema.parse({ length: 'date', date: '2026-12-31' })).toBe('2026-12-31');
  });

  it('refuses an end date before today', () => {
    expect(newPlanSchema(START).safeParse({ length: 'date', date: '2026-09-30' }).success).toBe(false);
    expect(endDateSchema(START).safeParse({ date: '2026-09-30' }).success).toBe(false);
    expect(endDateSchema(START).safeParse({ date: START }).success).toBe(true);
  });
});
