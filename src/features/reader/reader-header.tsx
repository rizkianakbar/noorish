import { Headpiece } from '#/components/ornament/headpiece.tsx';
import { chapterTranslatedName, useT } from '#/lib/i18n.ts';
import { usePrefs } from '#/lib/prefs.ts';
import { juzRange } from '#/lib/quran/juz.ts';
import type { Chapter } from '#/lib/quran/types.ts';
import { SurahControls, type SurahControlsProps } from './reader-controls.tsx';

function SurahFacts({ chapter }: { chapter: Chapter }) {
  const t = useT();
  const [firstPage, lastPage] = chapter.pages;

  return (
    <dl className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-muted-foreground">
      <div className="flex gap-1.5">
        <dt className="sr-only">{t.verses(chapter.versesCount)}</dt>
        <dd>{t.verses(chapter.versesCount)}</dd>
      </div>
      <div className="flex gap-1.5">
        <dt className="sr-only">{t.revealed}</dt>
        <dd>{chapter.revelationPlace === 'makkah' ? t.makkah : t.madinah}</dd>
      </div>
      <div className="flex gap-1.5">
        <dt>{t.revelationOrder}</dt>
        <dd className="text-foreground tabular-nums">{chapter.revelationOrder}</dd>
      </div>
      <div className="flex gap-1.5">
        <dt>{t.juz}</dt>
        <dd className="text-foreground tabular-nums">{juzRange(chapter)}</dd>
      </div>
      <div className="flex gap-1.5">
        <dt>{t.pages}</dt>
        <dd className="text-foreground tabular-nums">
          {firstPage === lastPage ? firstPage : `${firstPage}-${lastPage}`}
        </dd>
      </div>
    </dl>
  );
}

/**
 * The surah's opening: illuminated headpiece, its facts, and its controls.
 */
export function ReaderHeader({
  chapter,
  controls,
  ref,
}: {
  chapter: Chapter;
  controls: SurahControlsProps;
  ref: React.Ref<HTMLElement>;
}) {
  const prefs = usePrefs();
  const translatedName = chapterTranslatedName(chapter, prefs.language);

  return (
    // data-i18n: its labels follow the reader's language, which a server-drawn
    // page only knows once the app runs (see styles.css).
    <header ref={ref} data-i18n className="pt-8 pb-10 sm:pt-10">
      <h1 className="sr-only">
        {chapter.nameSimple}, {translatedName}
      </h1>
      <Headpiece
        key={chapter.number}
        surah={chapter.number}
        title={chapter.nameArabic}
        subtitle={`${chapter.nameSimple} — ${translatedName}`}
      />
      {!prefs.focusMode && <SurahFacts chapter={chapter} />}
      <SurahControls {...controls} />
    </header>
  );
}
