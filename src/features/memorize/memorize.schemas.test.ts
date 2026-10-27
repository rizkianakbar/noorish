import { describe, expect, it } from 'vitest';
import { passageSchema } from './memorize.schemas.ts';

const versesIn = (surah: number) => ({ 2: 286, 112: 4, 113: 5, 114: 6 })[surah];

describe('passageSchema', () => {
  const schema = passageSchema(versesIn);

  it('accepts a range within the surah, in order', () => {
    expect(schema.safeParse({ surah: 112, from: 1, to: 4 }).success).toBe(true);
    expect(schema.safeParse({ surah: 2, from: 255, to: 255 }).success).toBe(true);
  });

  it('refuses a range out of order or past the surah’s end', () => {
    expect(schema.safeParse({ surah: 112, from: 3, to: 2 }).success).toBe(false);
    expect(schema.safeParse({ surah: 112, from: 1, to: 5 }).success).toBe(false);
  });
});
