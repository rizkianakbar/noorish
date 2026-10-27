import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowRight, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { ChoiceGroup } from '#/components/choice-group.tsx';
import { ChoiceSelect } from '#/components/choice-select.tsx';
import { Button, buttonVariants } from '#/components/ui/button.tsx';
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from '#/components/ui/field.tsx';
import { useT } from '#/lib/i18n.ts';
import { usePrefs } from '#/lib/prefs.ts';
import { dateKey } from '#/lib/progress.ts';
import type { Chapter } from '#/lib/quran/types.ts';
import { cn } from '#/lib/utils.ts';
import { daysUntilDue, duePassages, nextPassage, passageId, passageLabel } from './memorize.lib.ts';
import { passageSchema } from './memorize.schemas.ts';
import { memorizeStore, removePassage, setMemorizeSetting, stopLearning } from './memorize.store.ts';
import type { PracticeRange, Practise } from './memorize.types.ts';

type DeletableRowProps = {
  label: string;
  question: string;
  onDelete: () => void;
  children: React.ReactNode;
};

/**
 * A row that can be deleted: a trash button beside it, and on press an inline
 * "are you sure" in the row's place (never a browser dialog), like ending a
 * reading plan.
 */
function DeletableRow(props: DeletableRowProps) {
  const { label, question, onDelete, children } = props;
  const t = useT();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex animate-in flex-wrap items-center gap-2 px-4 py-3 duration-200 fade-in">
        <p className="min-w-0 grow text-sm">{question}</p>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
          {t.cancel}
        </Button>
        <Button size="sm" variant="destructive" onClick={onDelete}>
          {t.delete}
        </Button>
      </div>
    );
  }
  return (
    <div className="flex items-center">
      {children}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        title={label}
        onClick={() => setConfirming(true)}
        className="mr-2 shrink-0 text-muted-foreground hover:text-destructive">
        <Trash2 />
      </Button>
    </div>
  );
}

type SectionTitleProps = { children: string };

function SectionTitle(props: SectionTitleProps) {
  const { children } = props;
  return <h2 className="mb-3 text-xs font-medium tracking-[0.16em] text-gold-ink uppercase">{children}</h2>;
}

/**
 * Choose a passage to learn: a surah, and the verses within it.
 */
type PassagePickerProps = {
  chapters: Chapter[];
  initial: PracticeRange;
};

function PassagePicker(props: PassagePickerProps) {
  const { chapters } = props;
  const t = useT();
  const navigate = useNavigate();
  const { settings } = memorizeStore.use();
  const versesIn = (surah: number) => chapters[surah - 1]?.versesCount;
  const form = useForm<PracticeRange>({ resolver: zodResolver(passageSchema(versesIn)), defaultValues: props.initial });
  const [surah, from] = useWatch({ control: form.control, name: ['surah', 'from'] });
  const verses = Array.from({ length: versesIn(surah) ?? 1 }, (_, i) => ({ value: i + 1, label: String(i + 1) }));

  return (
    <form
      className="rounded-2xl border bg-card p-5"
      onSubmit={form.handleSubmit((range) => navigate({ to: '/memorize', search: range }))}>
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="memorize-surah">{t.memorizeSurah}</FieldLabel>
          <Controller
            name="surah"
            control={form.control}
            render={({ field }) => (
              <ChoiceSelect
                id="memorize-surah"
                value={field.value}
                onChange={(next) => {
                  // A new surah starts at its first verses: up to five, a good first passage.
                  field.onChange(next);
                  form.setValue('from', 1);
                  form.setValue('to', Math.min(versesIn(next) ?? 1, 5));
                }}
                options={chapters.map((c) => ({ value: c.number, label: `${c.number}. ${c.nameSimple}` }))}
                className="w-full"
              />
            )}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="memorize-from">{t.memorizeFrom}</FieldLabel>
            <Controller
              name="from"
              control={form.control}
              render={({ field }) => (
                <ChoiceSelect
                  id="memorize-from"
                  value={field.value}
                  onChange={(next) => {
                    field.onChange(next);
                    // The range's end follows its start rather than falling before it.
                    if (form.getValues('to') < next) form.setValue('to', next);
                  }}
                  options={verses}
                  className="w-full min-w-0"
                />
              )}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="memorize-to">{t.memorizeTo}</FieldLabel>
            <Controller
              name="to"
              control={form.control}
              render={({ field }) => (
                <ChoiceSelect
                  id="memorize-to"
                  value={field.value}
                  onChange={field.onChange}
                  options={verses.filter((v) => v.value >= from)}
                  className="w-full min-w-0"
                />
              )}
            />
          </Field>
        </div>
        <Field>
          <FieldTitle>{t.practise}</FieldTitle>
          <ChoiceGroup<Practise>
            label={t.practise}
            value={settings.practise}
            onChange={(v) => setMemorizeSetting('practise', v)}
            options={[
              { value: 'arabic', label: t.practiseArabic },
              { value: 'meaning', label: t.practiseMeaning },
              { value: 'both', label: t.practiseBoth },
            ]}
          />
          <FieldDescription className="text-xs">{t.practiseHint}</FieldDescription>
        </Field>
        <Button type="submit" size="lg" className="h-11 w-full rounded-full">
          {t.memorizeStart}
          <ArrowRight data-icon="inline-end" />
        </Button>
      </FieldGroup>
    </form>
  );
}

type MemorizeHomeProps = { chapters: Chapter[] };

/**
 * The Memorize home: what's due for review first (reviewing is what makes
 * it stay), then the passage in progress, a new one, and all that's memorized.
 */
export function MemorizeHome(props: MemorizeHomeProps) {
  const { chapters } = props;
  const t = useT();
  const { language } = usePrefs();
  const { learning, passages } = memorizeStore.use();
  const today = dateKey(new Date());
  const due = duePassages(passages, today);
  const relative = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
  const name = (range: PracticeRange) => passageLabel(chapters[range.surah - 1]?.nameSimple, range);
  // What's in progress, else what follows the passage memorized last, else a
  // short surah from Juz 'Amma, where most people start.
  const latest = passages.reduce<(typeof passages)[number] | undefined>(
    (last, p) => (!last || p.learned > last.learned ? p : last),
    undefined,
  );
  const suggestion = learning?.range ??
    (latest && nextPassage(latest, (n) => chapters[n - 1]?.versesCount)) ?? { surah: 112, from: 1, to: 4 };

  return (
    <div className="space-y-9">
      <p className="text-sm text-muted-foreground">{t.memorizeIntro}</p>

      {due.length > 0 && (
        <section>
          <SectionTitle>{t.reviewDue}</SectionTitle>
          <ul className="space-y-2">
            {due.map((passage) => (
              <li key={passageId(passage)}>
                <Link
                  to="/memorize"
                  search={{ surah: passage.surah, from: passage.from, to: passage.to, mode: 'review' }}
                  className="pressable flex items-center gap-3 rounded-2xl border border-gold/40 bg-gold/8 px-4 py-3.5 hover:bg-gold/12">
                  <span className="flex size-9 items-center justify-center rounded-full bg-gold text-lapis [&_svg]:size-4">
                    <RotateCcw />
                  </span>
                  <span className="grow font-serif text-lg">{name(passage)}</span>
                  <span className="text-sm font-medium text-gold-ink">{t.reviewNow}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {learning && (
        <section>
          <SectionTitle>{t.continueLearning}</SectionTitle>
          <div className="rounded-2xl border bg-card">
            <DeletableRow
              label={t.deletePassage(name(learning.range))}
              question={t.stopLearningConfirm(name(learning.range))}
              onDelete={stopLearning}>
              <Link to="/memorize" search={learning.range} className="block min-w-0 grow px-5 py-4">
                <span className="flex items-center gap-3">
                  <span className="grow font-serif text-lg">{name(learning.range)}</span>
                  <ArrowRight className="size-4 text-gold-ink" />
                </span>
                <span className="mt-3 block h-1 overflow-hidden rounded-full bg-border">
                  <span
                    className="block h-full bg-gold"
                    style={{
                      width: `${(learning.learned.length / (learning.range.to - learning.range.from + 1)) * 100}%`,
                    }}
                  />
                </span>
                <span className="mt-1.5 block text-xs text-muted-foreground tabular-nums">
                  {t.versesLearned(learning.learned.length, learning.range.to - learning.range.from + 1)}
                </span>
              </Link>
            </DeletableRow>
          </div>
        </section>
      )}

      <section>
        <SectionTitle>{t.memorizeNew}</SectionTitle>
        <PassagePicker chapters={chapters} initial={suggestion} />
      </section>

      {passages.length > 0 && (
        <section>
          <SectionTitle>{t.memorizedPassages}</SectionTitle>
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {[...passages]
              .sort((a, b) => a.surah - b.surah || a.from - b.from)
              .map((passage) => (
                <li key={passageId(passage)}>
                  <DeletableRow
                    label={t.deletePassage(name(passage))}
                    question={t.deletePassageConfirm(name(passage))}
                    onDelete={() => removePassage(passage)}>
                    <Link
                      to="/memorize"
                      search={{ surah: passage.surah, from: passage.from, to: passage.to, mode: 'review' }}
                      className={cn(
                        buttonVariants({ variant: 'ghost' }),
                        'h-auto min-w-0 grow justify-between gap-3 rounded-none px-4 py-3',
                      )}>
                      <span className="truncate font-serif text-base font-normal">{name(passage)}</span>
                      <span className="shrink-0 text-xs font-normal text-muted-foreground">
                        {t.nextReview(relative.format(daysUntilDue(passage, today), 'day'))}
                      </span>
                    </Link>
                  </DeletableRow>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
