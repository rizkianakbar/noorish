import { requestPlanSync, usePlan } from '#/features/plans/plans.hooks.ts';
import { addDays, PLAN_LENGTHS } from '#/features/plans/plans.lib.ts';
import { startPlan } from '#/features/plans/plans.store.ts';
import { PlanContinue, PlanPortion } from '#/features/plans/plans-portion.tsx';
import { useT } from '#/lib/i18n.ts';
import { usePrefs } from '#/lib/prefs.ts';

// Sits inside the frontispiece's dark field, beside "Continue reading".
const panel = 'relative min-w-0 flex-1 basis-80 rounded-2xl bg-lapis/70 p-5 ring-1 ring-gold/25 sm:p-6';

/**
 * Without a plan, a one-tap start: each pace with the pages a day it takes,
 * so choosing one needs no form.
 */
type PlanInviteProps = { today: string };

function PlanInvite(props: PlanInviteProps) {
  const t = useT();
  return (
    <section aria-labelledby="plan-invite" className={panel}>
      <h2 id="plan-invite" className="font-serif text-xl">
        {t.planInviteTitle}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t.planInviteNote}</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {PLAN_LENGTHS.map((days) => (
          <button
            key={days}
            type="button"
            onClick={() => {
              startPlan(addDays(props.today, days - 1));
              requestPlanSync();
            }}
            className="pressable rounded-xl border bg-card px-2 py-3 text-center hover:border-gold/50 focus-visible:outline-2 focus-visible:outline-gold">
            <span className="block text-sm font-medium">{t.planDays(days)}</span>
            <span className="block text-xs text-muted-foreground tabular-nums">
              {t.planPerDay(Math.ceil(604 / days))}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

/**
 * Today's reading from the reader's plan, or an invitation to start one.
 * A panel in the frontispiece, hidden from Settings if unwanted.
 */
export function HomePlan() {
  const t = useT();
  const { planOnHome } = usePrefs();
  const { plan, summary, today } = usePlan();
  if (!planOnHome || plan?.completedAt) return null;
  if (!plan) return <PlanInvite today={today} />;
  if (!summary?.portion) return null;

  return (
    <section aria-labelledby="todays-reading" className={`${panel} flex flex-col gap-4`}>
      <div className="min-w-0 grow">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="todays-reading" className="text-xs font-medium tracking-[0.18em] text-gold-ink uppercase">
            {t.todaysReading}
          </h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            {t.planDayOf(Math.min(summary.day, summary.totalDays), summary.totalDays)}
          </span>
        </div>
        <div className="mt-2">
          <PlanPortion summary={summary} />
        </div>
      </div>
      <PlanContinue summary={summary} className="self-start" />
    </section>
  );
}
