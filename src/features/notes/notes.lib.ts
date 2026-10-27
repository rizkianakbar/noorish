import { z } from 'zod';
import { noteInputSchema } from '#/server/schemas.ts';

/**
 * A note's text, by the server's own rule (trimmed, not empty, 10,000
 * characters at most), so the form can't accept what saving would reject.
 */
export const noteFormSchema = z.object({ body: noteInputSchema.shape.body });
