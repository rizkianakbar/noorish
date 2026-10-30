import { useState } from 'react';
import { OnOffChoice } from '#/components/choice-group.tsx';
import { SettingsRow } from '#/features/settings/settings-controls.tsx';
import { useT } from '#/lib/i18n.ts';
import { disablePush, type EnableResult, enablePush, pushSupport } from './prayer.push.ts';
import { prayerStore, setPrayerSetting } from './prayer.store.ts';

/**
 * The adhan notification settings: on/off, and the "before the time ends"
 * nudge once on. Where the browser can't get push, a hint says why (on
 * iPhone, how to install) instead of a switch that would do nothing.
 */
export function PrayerNotifySettings() {
  const t = useT();
  const { notify, lastCall } = prayerStore.use();
  const [support] = useState(pushSupport);
  const [problem, setProblem] = useState<Exclude<EnableResult, 'on'> | null>(() =>
    support === 'supported' && Notification.permission === 'denied' ? 'denied' : null,
  );
  const [busy, setBusy] = useState(false);

  const toggle = async (on: boolean) => {
    setBusy(true);
    try {
      if (!on) {
        await disablePush();
        setProblem(null);
        return;
      }
      const result = await enablePush();
      setProblem(result === 'on' ? null : result);
      if (result === 'on') navigator.vibrate?.(15);
    } catch {
      setProblem('unavailable');
    } finally {
      setBusy(false);
    }
  };

  const hint = {
    install: t.prayerNotifyInstall,
    unsupported: t.prayerNotifyUnsupported,
    supported: problem === 'denied' ? t.prayerNotifyDenied : problem ? t.prayerNotifyUnavailable : t.prayerNotifyHint,
  }[support];

  return (
    <>
      <SettingsRow label={t.prayerNotify} hint={hint}>
        {support === 'supported' && (
          <div className={busy ? 'pointer-events-none opacity-60 transition-opacity' : 'transition-opacity'}>
            <OnOffChoice label={t.prayerNotify} value={notify} onChange={(on) => void toggle(on)} />
          </div>
        )}
      </SettingsRow>
      {notify && support === 'supported' && (
        <SettingsRow label={t.prayerLastCall} hint={t.prayerLastCallHint}>
          <OnOffChoice label={t.prayerLastCall} value={lastCall} onChange={(on) => setPrayerSetting('lastCall', on)} />
        </SettingsRow>
      )}
    </>
  );
}
