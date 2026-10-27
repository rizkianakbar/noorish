import { Link } from '@tanstack/react-router';
import { ArrowRight, Check, Loader2, Pause, Play, RotateCcw, SlidersHorizontal, Volume2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ChoiceGroup, OnOffChoice } from '#/components/choice-group.tsx';
import { Button, buttonVariants } from '#/components/ui/button.tsx';
import { usePlayer } from '#/features/audio/audio.hooks.ts';
import { SettingsRow } from '#/features/settings/settings-controls.tsx';
import { useReaderFontsReady } from '#/hooks/use-reader-fonts-ready.ts';
import { useT } from '#/lib/i18n.ts';
import { resolveTranslation, usePrefs } from '#/lib/prefs.ts';
import { dateKey } from '#/lib/progress.ts';
import { useChapters, useSurah } from '#/lib/quran/data.ts';
import type { Chapter, Verse } from '#/lib/quran/types.ts';
import { cn } from '#/lib/utils.ts';
import {
  isListening,
  listeningStore,
  listenToPassage,
  listenToVerse,
  stopListening,
  toggleListening,
} from './memorize.audio.ts';
import {
  arabicWords,
  daysUntilDue,
  firstStep,
  LISTEN_REPEATS,
  meaningWords,
  nextPassage,
  passageLabel,
  sameRange,
  stepAfterBuild,
} from './memorize.lib.ts';
import {
  completePassage,
  findPassage,
  markVerseLearned,
  memorizeStore,
  recordReview,
  setMemorizeSetting,
} from './memorize.store.ts';
import type { PracticeRange, Step } from './memorize.types.ts';
import { MemorizeBuild } from './memorize-build.tsx';
import { MemorizeVerse } from './memorize-verse.tsx';

const EMPTY: ReadonlySet<number> = new Set();

function rangeVerses(range: PracticeRange): number[] {
  return Array.from({ length: range.to - range.from + 1 }, (_, i) => range.from + i);
}

type ProgressBarsProps = {
  range: PracticeRange;
  learned: ReadonlySet<number>;
  current: number | null;
};

/**
 * One bar per verse: learned (gold), the one in hand (pale gold), still to come.
 */
function ProgressBars(props: ProgressBarsProps) {
  const { range, learned, current } = props;
  return (
    <ol className="flex flex-wrap gap-1.5" aria-hidden="true">
      {rangeVerses(range).map((verse) => (
        <li
          key={verse}
          className={cn(
            'h-1.5 w-6 rounded-full bg-border transition-colors duration-300',
            learned.has(verse) && 'bg-gold',
            verse === current && !learned.has(verse) && 'bg-gold/45',
          )}
        />
      ))}
    </ol>
  );
}

type ListenButtonProps = {
  playing: boolean;
  loading: boolean;
  onClick: () => void;
  label: string;
};

/**
 * The big round play/pause of the Listen step.
 */
function ListenButton(props: ListenButtonProps) {
  const { playing, loading, onClick, label } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="pressable flex size-14 shrink-0 items-center justify-center rounded-full bg-gold text-lapis shadow-[0_8px_20px_-8px_color-mix(in_oklch,var(--gold)_70%,transparent)] [--press-scale:0.93] hover:bg-gold/85 [&_svg]:size-6">
      {loading ? <Loader2 className="animate-spin" /> : playing ? <Pause /> : <Play className="translate-x-0.5" />}
    </button>
  );
}

function OptionsPanel() {
  const t = useT();
  const { settings } = memorizeStore.use();
  return (
    <div className="animate-in divide-y rounded-2xl border bg-card px-5 fade-in slide-in-from-top-1">
      <SettingsRow label={t.listenRepeats}>
        <ChoiceGroup
          label={t.listenRepeats}
          value={settings.listenRepeats}
          onChange={(v) => setMemorizeSetting('listenRepeats', v)}
          options={LISTEN_REPEATS.map((n) => ({ value: n, label: `${n}×` }))}
        />
      </SettingsRow>
      <SettingsRow label={t.firstWordHint}>
        <OnOffChoice
          label={t.firstWordHint}
          value={settings.firstWordHint}
          onChange={(on) => setMemorizeSetting('firstWordHint', on)}
        />
      </SettingsRow>
      <SettingsRow label={t.meaning}>
        <OnOffChoice
          label={t.meaning}
          value={settings.showMeaning}
          onChange={(on) => setMemorizeSetting('showMeaning', on)}
        />
      </SettingsRow>
    </div>
  );
}

type SessionDoneProps = {
  range: PracticeRange;
  chapter: Chapter | undefined;
  mode: 'learn' | 'review';
};

/**
 * The end of a session: memorized (and what to learn next), or reviewed
 * (and when it comes back).
 */
function SessionDone(props: SessionDoneProps) {
  const { range, chapter, mode } = props;
  const t = useT();
  const { language } = usePrefs();
  const { passages } = memorizeStore.use();
  const chapters = useChapters().data;
  const next = mode === 'learn' && chapters ? nextPassage(range, (n) => chapters[n - 1]?.versesCount) : null;
  const passage = findPassage(passages, range);
  const relative = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });

  return (
    <section className="dark relative animate-in overflow-hidden rounded-[1.75rem] bg-(--ornament-field) px-6 py-10 text-center text-foreground ring-1 ring-gold/30 duration-300 fade-in zoom-in-95">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-gold text-lapis [&_svg]:size-7">
        <Check />
      </span>
      <h2 className="mt-5 font-serif text-2xl">
        {mode === 'learn' ? t.doneTitle(passageLabel(chapter?.nameSimple, range)) : t.reviewedTitle}
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        {mode === 'learn' || !passage
          ? t.doneNote
          : t.nextReview(relative.format(daysUntilDue(passage, dateKey(new Date())), 'day'))}
      </p>
      <div className="mt-7 flex flex-col items-center gap-2">
        {next && (
          <Link
            to="/memorize"
            search={next}
            className={cn(buttonVariants({ size: 'lg', variant: 'gold' }), 'h-11 rounded-full px-5 text-base')}>
            {t.learnNext(passageLabel(chapters?.[next.surah - 1]?.nameSimple, next))}
            <ArrowRight data-icon="inline-end" />
          </Link>
        )}
        <Link
          to="/memorize"
          search={{}}
          className={cn(buttonVariants({ variant: 'ghost', size: 'lg' }), 'h-11 rounded-full')}>
          {t.backToMemorize}
        </Link>
      </div>
    </section>
  );
}

type MemorizeSessionProps = {
  range: PracticeRange;
  chapter: Chapter | undefined;
  mode: 'learn' | 'review';
};

/**
 * Learning a passage verse by verse (Listen, then Build it from a word bank:
 * its Arabic, its meaning, or both), then reciting all of it (Connect); or
 * reviewing one, which is Connect alone. One thing to do at a time, with the
 * main action always last and widest.
 */
export function MemorizeSession(props: MemorizeSessionProps) {
  const { range, chapter, mode } = props;
  const t = useT();
  const prefs = usePrefs();
  const { settings, learning } = memorizeStore.use();
  const listening = listeningStore.use();
  const player = usePlayer();
  const surahData = useSurah(range.surah);
  const fontsReady = useReaderFontsReady(prefs.arabicFont);
  const [step, setStep] = useState<Step>(() => (mode === 'review' ? { kind: 'connect' } : firstStep(range, learning)));
  const [revealed, setRevealed] = useState<ReadonlyMap<number, ReadonlySet<number>>>(new Map());
  const [optionsOpen, setOptionsOpen] = useState(false);
  // Counts every step entered, so going back to a verse gives a fresh puzzle.
  const [round, setRound] = useState(0);
  const translation = resolveTranslation(prefs) ?? prefs.language;
  // Every word of the surah: where the word bank's extra tiles come from.
  const arabicPool = useMemo(() => surahData?.verses.flatMap((v) => arabicWords(v.words)) ?? [], [surahData]);
  const meaningPool = useMemo(
    () => surahData?.verses.flatMap((v) => meaningWords(v[translation])) ?? [],
    [surahData, translation],
  );

  // Leaving the page stops whatever it was playing.
  useEffect(() => stopListening, []);

  if (step.kind === 'done') return <SessionDone range={range} chapter={chapter} mode={mode} />;

  const verseAt = (n: number): Verse | undefined => surahData?.verses[n - 1];
  const learned = new Set(
    mode === 'review' || step.kind === 'connect'
      ? rangeVerses(range)
      : sameRange(learning?.range, range)
        ? learning?.learned
        : [],
  );
  const recited = (n: number) => (player.surah === range.surah && player.verse === n ? player.word : undefined);
  const playing = isListening(listening, player);
  const verseNumber = step.kind === 'connect' ? null : step.verse;
  const verse = verseNumber !== null ? verseAt(verseNumber) : undefined;
  const total = range.to - range.from + 1;
  const onThisVerse = listening.mode === 'verse' && listening.verse === verseNumber;
  const onPassage = listening.mode === 'passage';
  const meaningShown = settings.showMeaning ? translation : null;

  const go = (next: Step) => {
    setRevealed(new Map());
    setRound((n) => n + 1);
    setStep(next);
    // Moving on from a tap, so the next verse may start playing at once.
    if (next.kind === 'listen') listenToVerse(range.surah, next.verse, settings.listenRepeats);
    else stopListening();
  };
  const built = (n: number, part: 'arabic' | 'meaning') => {
    const next = stepAfterBuild(range, n, part, settings.practise);
    if (next.kind !== 'build') markVerseLearned(range, n);
    if (next.kind === 'done') completePassage(range);
    go(next);
  };
  const reveal = (n: number, word: number) =>
    setRevealed((prev) => new Map(prev).set(n, new Set(prev.get(n)).add(word)));

  const title =
    step.kind === 'listen'
      ? t.stepListen
      : step.kind === 'build'
        ? step.part === 'arabic'
          ? t.stepBuild
          : t.stepBuildMeaning
        : mode === 'review'
          ? t.reviewNow
          : t.stepConnect;
  const hint =
    step.kind === 'listen'
      ? t.stepListenHint
      : step.kind === 'build'
        ? step.part === 'arabic'
          ? t.stepBuildHint
          : t.stepBuildMeaningHint
        : mode === 'review'
          ? t.reviewHint
          : t.stepConnectHint;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 grow">
          <p className="font-serif text-xl">{passageLabel(chapter?.nameSimple, range)}</p>
          <div className="mt-2.5 flex items-center gap-3">
            <ProgressBars range={range} learned={learned} current={verseNumber} />
            {verseNumber !== null && total > 1 && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {t.verseOf(verseNumber - range.from + 1, total)}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t.options}
          aria-expanded={optionsOpen}
          onClick={() => setOptionsOpen((open) => !open)}
          className={cn('text-muted-foreground', optionsOpen && 'bg-muted text-foreground')}>
          <SlidersHorizontal />
        </Button>
      </div>

      {optionsOpen && <OptionsPanel />}

      {/* The step: what to do now, then the verse (or passage) to do it with. */}
      <section
        key={`${step.kind}-${verseNumber}-${step.kind === 'build' ? step.part : ''}`}
        className={cn(
          'animate-in rounded-[1.75rem] border bg-card px-5 pt-5 pb-6 duration-300 fade-in slide-in-from-bottom-2 sm:px-7',
          step.kind === 'listen' && 'border-gold/40',
        )}>
        <div className="flex items-start gap-3">
          <div className="grow">
            <p className="text-xs font-medium tracking-[0.16em] text-gold-ink uppercase">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
          </div>
          {step.kind === 'build' && (
            // Duolingo's speaker: hear the verse again without leaving the puzzle.
            <Button
              variant="outline"
              size="icon-lg"
              aria-label={t.playVerse}
              title={t.playVerse}
              onClick={() => (onThisVerse ? toggleListening() : listenToVerse(range.surah, step.verse, 1))}
              className="shrink-0 rounded-full text-gold-ink">
              {onThisVerse && playing ? <Pause /> : <Volume2 />}
            </Button>
          )}
        </div>

        <div
          className={cn(
            'mt-5 space-y-6 transition-opacity duration-300',
            fontsReady && surahData ? 'opacity-100' : 'opacity-0',
          )}>
          {step.kind === 'listen' && verse && (
            <MemorizeVerse
              verse={verse}
              hidden={false}
              firstWordHint={false}
              revealed={EMPTY}
              onReveal={() => {}}
              recitedWord={recited(verse.n)}
              translation={meaningShown ? verse[meaningShown] : null}
              size="large"
            />
          )}

          {step.kind === 'build' && verse && (
            <>
              {/* Building the meaning: the Arabic it translates stays in view as the prompt. */}
              {step.part === 'meaning' && (
                <MemorizeVerse
                  verse={verse}
                  hidden={false}
                  firstWordHint={false}
                  revealed={EMPTY}
                  onReveal={() => {}}
                  recitedWord={recited(verse.n)}
                  translation={null}
                />
              )}
              <MemorizeBuild
                key={`${verse.key}:${step.part}:${round}`}
                seed={`${verse.key}:${step.part}:${round}`}
                part={step.part}
                words={step.part === 'arabic' ? arabicWords(verse.words) : meaningWords(verse[translation])}
                pool={step.part === 'arabic' ? arabicPool : meaningPool}
                onContinue={() => built(verse.n, step.part)}
                onListenAgain={() => go({ kind: 'listen', verse: verse.n })}
              />
            </>
          )}

          {step.kind === 'connect' &&
            rangeVerses(range).map((n) => {
              const v = verseAt(n);
              return (
                v && (
                  <MemorizeVerse
                    key={n}
                    verse={v}
                    hidden
                    firstWordHint={settings.firstWordHint}
                    revealed={revealed.get(n) ?? EMPTY}
                    onReveal={(word) => reveal(n, word)}
                    recitedWord={recited(n)}
                    translation={meaningShown ? v[meaningShown] : null}
                  />
                )
              );
            })}
        </div>
      </section>

      {step.kind === 'listen' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <ListenButton
              playing={onThisVerse && playing}
              loading={onThisVerse && player.loading}
              label={onThisVerse && playing ? t.pause : t.play}
              onClick={() =>
                onThisVerse ? toggleListening() : listenToVerse(range.surah, step.verse, settings.listenRepeats)
              }
            />
            <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
              {t.listenCount(onThisVerse ? listening.plays : 0, settings.listenRepeats)}
            </p>
          </div>
          <Button
            size="lg"
            className="h-12 w-full rounded-full text-base"
            variant={onThisVerse && listening.plays >= settings.listenRepeats ? 'gold' : 'outline'}
            onClick={() =>
              go({ kind: 'build', verse: step.verse, part: settings.practise === 'meaning' ? 'meaning' : 'arabic' })
            }>
            {t.listenDone}
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      )}

      {step.kind === 'connect' && (
        <div className="space-y-3">
          <Button
            variant="outline"
            size="lg"
            className="h-11 w-full rounded-full"
            onClick={() => (onPassage ? toggleListening() : listenToPassage(range))}>
            {onPassage && playing ? <Pause data-icon="inline-start" /> : <Play data-icon="inline-start" />}
            {onPassage && playing ? t.pause : t.playPassage}
          </Button>
          {mode === 'learn' ? (
            <Button
              size="lg"
              variant="gold"
              className="h-12 w-full rounded-full text-base"
              onClick={() => {
                completePassage(range);
                go({ kind: 'done' });
              }}>
              <Check data-icon="inline-start" />
              {t.memorizedIt}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="lg"
                className="h-12 flex-1 rounded-full text-base"
                onClick={() => {
                  recordReview(range, false);
                  go({ kind: 'done' });
                }}>
                <RotateCcw data-icon="inline-start" />
                {t.needsWork}
              </Button>
              <Button
                size="lg"
                variant="gold"
                className="h-12 flex-1 rounded-full text-base"
                onClick={() => {
                  recordReview(range, true);
                  go({ kind: 'done' });
                }}>
                <Check data-icon="inline-start" />
                {t.solid}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
