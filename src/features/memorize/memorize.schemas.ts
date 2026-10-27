import { z } from 'zod';

// Form schemas, apart from memorize.lib.ts, which the home page loads: zod should only
// load with the forms.

/**
 * The new-passage form: a surah and a range of its verses, in order.
 */
export function passageSchema(versesIn: (surah: number) => number | undefined) {
  return z
    .object({ surah: z.number().int().min(1).max(114), from: z.number().int().min(1), to: z.number().int().min(1) })
    .refine((range) => range.from <= range.to && range.to <= (versesIn(range.surah) ?? 0), { path: ['to'] });
}
