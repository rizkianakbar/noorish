import { describe, expect, it } from 'vitest';
import { loginSchema } from './auth.lib.ts';

describe('loginSchema', () => {
  it('needs a valid email and a password', () => {
    expect(loginSchema.safeParse({ email: 'reader@example.com', password: 'x' }).success).toBe(true);
    expect(loginSchema.safeParse({ email: 'not-an-email', password: 'x' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'reader@example.com', password: '' }).success).toBe(false);
  });
});
