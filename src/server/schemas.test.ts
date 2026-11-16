import { describe, expect, it } from 'vitest';
import { pushSubscriptionSchema } from './schemas.ts';

const keys = { p256dh: 'BKey', auth: 'auth' };

describe('pushSubscriptionSchema', () => {
  it('accepts the browsers’ push services', () => {
    for (const endpoint of [
      'https://fcm.googleapis.com/fcm/send/abc',
      'https://updates.push.services.mozilla.com/wpush/v2/abc',
      'https://web.push.apple.com/abc',
      'https://wns2-par02p.notify.windows.com/w/?token=abc',
    ]) {
      expect(pushSubscriptionSchema.safeParse({ endpoint, keys }).success).toBe(true);
    }
  });

  it('rejects any other host, so the server cannot be aimed elsewhere', () => {
    for (const endpoint of [
      'https://evil.example/hook',
      'https://fcm.googleapis.com.evil.example/x',
      'https://evilfcm.googleapis.com.example/x',
      'http://fcm.googleapis.com/fcm/send/abc',
    ]) {
      expect(pushSubscriptionSchema.safeParse({ endpoint, keys }).success).toBe(false);
    }
  });
});
