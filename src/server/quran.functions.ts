import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { readSurahPreview } from './quran.server.ts';

/**
 * The opening verses of a surah, in every language, for its server-rendered
 * page (see `readSurahPreview`). Called only while rendering on the server.
 */
export const getSurahPreviewFn = createServerFn({ method: 'GET' })
  .validator(z.object({ surah: z.number().int().min(1).max(114) }))
  .handler(({ data }) => readSurahPreview(data.surah));
