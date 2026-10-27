import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { z } from 'zod';
import { ChoiceGroup } from '#/components/choice-group.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Field, FieldLabel } from '#/components/ui/field.tsx';
import { Input } from '#/components/ui/input.tsx';
import { useT } from '#/lib/i18n.ts';
import { usePrefs } from '#/lib/prefs.ts';
import { requestPlanSync, usePlan } from './plans.hooks.ts';
import { addDays, PLAN_LENGTHS, type PlanSummary } from './plans.lib.ts';
import { endDateSchema, newPlanSchema } from './plans.schemas.ts';
import { accountStore, endPlan, setPlanEndDate, startPlan } from './plans.store.ts';
import type { ReadingPlan } from './plans.types.ts';
import { PlanBar, PlanContinue, PlanPortion } from './plans-portion.tsx';

function useLongDate() {
  const { language } = usePrefs();
  const format = new Intl.DateTimeFormat(language, { dateStyle: 'medium' });
  // Date keys are local calendar days; read them at noon so no timezone shifts the day.
  return (key: string) => format.format(new Date(`${key}T12:00:00`));
}

type PlanSetupProps = {
  today: string;
};

function PlanSetup(props: PlanSetupProps) {
  const t = useT();
  const schema = newPlanSchema(props.today);
  const form = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { length: 30, date: addDays(props.today, 29) },
  });
  const length = useWatch({ control: form.control, name: 'length' });
  const submit = form.handleSubmit((endDate) => {
    startPlan(endDate);
    requestPlanSync();
  });

  return (
    <form onSubmit={submit} className="rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground">{t.planIntro}</p>
      <Controller
        name="length"
        control={form.control}
        render={({ field }) => (
          <ChoiceGroup<z.input<typeof schema>['length']>
            label={t.planEndDate}
            value={field.value}
            onChange={field.onChange}
            options={[
              ...PLAN_LENGTHS.map((days) => ({ value: days, label: t.planDays(days) })),
              { value: 'date' as const, label: `${t.planEndDate}…` },
            ]}
            className="mt-4"
          />
        )}
      />
      {length === 'date' && (
        <Field className="mt-3 w-auto">
          <FieldLabel htmlFor="plan-end-date" className="sr-only">
            {t.planEndDate}
          </FieldLabel>
          <Input id="plan-end-date" type="date" min={props.today} className="w-auto" {...form.register('date')} />
        </Field>
      )}
      <Button type="submit" size="lg" className="mt-4" disabled={!form.formState.isValid}>
        {t.startPlan}
      </Button>
    </form>
  );
}

type PlanActionsProps = {
  plan: ReadingPlan;
  today: string;
};

function PlanActions(props: PlanActionsProps) {
  const t = useT();
  const [mode, setMode] = useState<'idle' | 'date' | 'end'>('idle');
  const form = useForm<{ date: string }>({
    resolver: zodResolver(endDateSchema(props.today)),
    mode: 'onChange',
    defaultValues: { date: props.plan.endDate },
  });

  if (mode === 'date') {
    return (
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={form.handleSubmit(({ date }) => {
          setPlanEndDate(date);
          setMode('idle');
        })}>
        <Field className="w-auto">
          <FieldLabel htmlFor="plan-change-date" className="sr-only">
            {t.planEndDate}
          </FieldLabel>
          <Input id="plan-change-date" type="date" min={props.today} className="w-auto" {...form.register('date')} />
        </Field>
        <Button type="submit" size="sm" disabled={!form.formState.isValid}>
          {t.save}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setMode('idle')}>
          {t.cancel}
        </Button>
      </form>
    );
  }

  if (mode === 'end') {
    return (
      <div className="space-y-2">
        <p className="text-sm">{t.planEndConfirm}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="destructive" onClick={endPlan}>
            {t.planEnd}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setMode('idle')}>
            {t.cancel}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-1">
      <Button size="sm" variant="ghost" className="-ml-2.5 text-muted-foreground" onClick={() => setMode('date')}>
        {t.planChangeDate}
      </Button>
      <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setMode('end')}>
        {t.planEnd}
      </Button>
    </div>
  );
}

type ActivePlanProps = { plan: ReadingPlan; summary: PlanSummary; today: string };

function ActivePlan(props: ActivePlanProps) {
  const { plan, summary, today } = props;
  const t = useT();
  const longDate = useLongDate();

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-xs font-medium tracking-[0.12em] text-gold-ink uppercase">{t.todaysReading}</h4>
        <span className="text-xs text-muted-foreground tabular-nums">
          {t.planDayOf(Math.min(summary.day, summary.totalDays), summary.totalDays)}
        </span>
      </div>
      <PlanPortion summary={summary} />
      <PlanContinue summary={summary} className="w-full" />

      <div className="border-t pt-4">
        <PlanBar value={summary.pagesRead / 604} />
        <div className="mt-1.5 flex justify-between gap-2 text-xs text-muted-foreground tabular-nums">
          <span>{t.planPagesRead(summary.pagesRead)}</span>
          <span title={longDate(plan.endDate)}>
            {summary.daysLeft > 0 ? t.planDaysLeft(summary.daysLeft) : longDate(plan.endDate)}
          </span>
        </div>
        {summary.daysLeft === 0 && <p className="mt-3 text-xs text-muted-foreground">{t.planPastEnd}</p>}
      </div>

      <PlanActions key={plan.endDate} plan={plan} today={today} />
    </div>
  );
}

type CompletedPlanProps = { plan: ReadingPlan };

function CompletedPlan(props: CompletedPlanProps) {
  const { plan } = props;
  const t = useT();
  const { language } = usePrefs();
  const finished = new Intl.DateTimeFormat(language, { dateStyle: 'medium' }).format(
    new Date(plan.completedAt ?? Date.now()),
  );

  return (
    <div className="rounded-lg border border-gold/40 bg-card p-4 text-center">
      <div className="font-serif text-xl text-gold-ink">{t.planComplete}</div>
      <p className="mt-1 text-sm text-muted-foreground">{t.planCompleteNote(finished)}</p>
      <Button size="lg" variant="outline" className="mt-4" onClick={endPlan}>
        {t.planStartAnother}
      </Button>
    </div>
  );
}

/**
 * The reading plan section of the journal: set one up, follow it, or
 * celebrate finishing it.
 */
export function PlanPanel() {
  const t = useT();
  const { plan, summary, today } = usePlan();
  const { signedIn } = accountStore.use();

  return (
    <section>
      <h3 className="mb-2 text-xs font-medium text-muted-foreground">{t.readingPlan}</h3>
      {!plan || !summary ? (
        <PlanSetup today={today} />
      ) : plan.completedAt ? (
        <CompletedPlan plan={plan} />
      ) : (
        <ActivePlan plan={plan} summary={summary} today={today} />
      )}
      {plan && signedIn === false && (
        <Link to="/login" className="mt-2 block text-xs text-gold-ink underline-offset-4 hover:underline">
          {t.planSyncHint}
        </Link>
      )}
    </section>
  );
}
