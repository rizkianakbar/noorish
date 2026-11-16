import { requestPlanSync, usePlan } from '#/features/plans/plans.hooks.ts';
import { addDays, PLAN_LENGTHS } from '#/features/plans/plans.lib.ts';
import { startPlan } from '#/features/plans/plans.store.ts';
import { useT } from '#/lib/i18n.ts';
import { usePrefs } from '#/lib/prefs.ts';

const panel = 'mt-6 rounded-2xl px-5 py-5 ring-1 ring-gold/30 sm:px-6';

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
 * Below the frontispiece, only while there is no plan: an invitation to
 * start one (a running plan's portion is the frontispiece's "today").
 * Hidden from Settings if unwanted.
 */
export function HomePlanInvite() {
  const { planOnHome } = usePrefs();
  const { plan, today } = usePlan();
  if (!planOnHome || plan) return null;
  return <PlanInvite today={today} />;
}
