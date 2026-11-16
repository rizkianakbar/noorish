import { usePrefs } from '#/lib/prefs.ts';

const BISMILLAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';
const BISMILLAH_LATIN = { kemenag: 'Bismillāhir-raḥmānir-raḥīm', simple: 'Bismillahir rahmanir raheem' };

const LATIN_CLASS = 'mt-1 text-center font-serif text-sm text-gold-ink italic';

function Diamond() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="size-3 shrink-0 text-gold">
      <path d="M10 0 L20 10 L10 20 L0 10 Z M10 5 L15 10 L10 15 L5 10 Z" fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

export function ReaderBismillah({ allVariants = false }: { allVariants?: boolean }) {
  const prefs = usePrefs();

  return (
    <div className="pb-6">
      <div className="flex items-center justify-center gap-4">
        <Diamond />
        <p
          dir="rtl"
          lang="ar"
          className="text-center font-arabic text-3xl leading-[1.9] text-gold-ink select-none sm:text-4xl">
          {BISMILLAH}
        </p>
        <Diamond />
      </div>
      {allVariants
        ? // Server-rendered: both styles, and CSS shows the reader's.
          (['kemenag', 'simple'] as const).map((style) => (
            <p key={style} lang="ar-Latn" data-show-latin={style} className={LATIN_CLASS}>
              {BISMILLAH_LATIN[style]}
            </p>
          ))
        : prefs.latin &&
          !prefs.focusMode && (
            <p lang="ar-Latn" className={LATIN_CLASS}>
              {BISMILLAH_LATIN[prefs.latinStyle]}
            </p>
          )}
    </div>
  );
}
