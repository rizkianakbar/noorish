import { describe, expect, it } from 'vitest';
import { noteFormSchema } from './notes.lib.ts';

describe('noteFormSchema', () => {
  it('trims the note and refuses an empty or overlong one', () => {
    expect(noteFormSchema.parse({ body: '  A reflection  ' })).toEqual({ body: 'A reflection' });
    expect(noteFormSchema.safeParse({ body: '   ' }).success).toBe(false);
    expect(noteFormSchema.safeParse({ body: 'x'.repeat(10_001) }).success).toBe(false);
  });
});
