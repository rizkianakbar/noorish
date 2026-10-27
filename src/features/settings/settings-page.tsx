import { ChoiceGroup, OnOffChoice } from '#/components/choice-group.tsx';
import { PageShell } from '#/components/page-shell.tsx';
import { ShortcutList } from '#/components/shortcut-list.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Slider } from '#/components/ui/slider.tsx';
import { reciters } from '#/features/audio/audio.api.ts';
import { play, stop } from '#/features/audio/audio.lib.ts';
import { prayerStore, setPrayerSetting } from '#/features/prayer/prayer.store.ts';
import { PwaInstallRow } from '#/features/pwa/pwa-install.tsx';
import { useT } from '#/lib/i18n.ts';
import {
  type ArabicFont,
  arabicFonts,
  arabicSizeRange,
  formatRate,
  type Language,
  type LatinStyle,
  playbackRates,
  setPref,
  type Theme,
  type TranslationPref,
  themes,
  usePrefs,
} from '#/lib/prefs.ts';
import { SettingsRow, SettingsSelect } from './settings-controls.tsx';

const PREVIEW_TEXT = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';

export function SettingsPage() {
  const t = useT();
  const prefs = usePrefs();
  const prayerSettings = prayerStore.use();

  return (
    <PageShell title={t.settings} ownTitle>
      <div className="mt-6 divide-y">
        <SettingsRow label={t.language} hint={t.languageHint}>
          <ChoiceGroup<Language>
            label={t.language}
            value={prefs.language}
            onChange={(v) => setPref('language', v)}
            options={[
              { value: 'en', label: 'English' },
              { value: 'id', label: 'Bahasa Indonesia' },
            ]}
          />
        </SettingsRow>

        <SettingsRow label={t.translation}>
          <ChoiceGroup<TranslationPref>
            label={t.translation}
            value={prefs.translation}
            onChange={(v) => setPref('translation', v)}
            options={[
              { value: 'auto', label: t.translationAuto },
              { value: 'en', label: 'EN' },
              { value: 'id', label: 'ID' },
              { value: 'off', label: t.translationOff },
            ]}
          />
        </SettingsRow>

        <SettingsRow label={t.latin} hint={t.latinHint}>
          <OnOffChoice label={t.latin} value={prefs.latin} onChange={(on) => setPref('latin', on)} />
        </SettingsRow>

        <SettingsRow label={t.latinStyle} hint={t.latinStyleHint}>
          <ChoiceGroup<LatinStyle>
            label={t.latinStyle}
            value={prefs.latinStyle}
            onChange={(v) => setPref('latinStyle', v)}
            options={[
              { value: 'kemenag', label: t.latinKemenag },
              { value: 'simple', label: t.latinSimple },
            ]}
          />
        </SettingsRow>

        <SettingsRow label={t.theme}>
          <ChoiceGroup<Theme>
            label={t.theme}
            value={prefs.theme}
            onChange={(v) => setPref('theme', v)}
            options={themes.map((theme) => ({ value: theme, label: t.themeNames[theme] }))}
          />
        </SettingsRow>

        <SettingsRow label={t.arabicFont} htmlFor="setting-arabic-font">
          <SettingsSelect
            id="setting-arabic-font"
            prefKey="arabicFont"
            parse={(v) => v as ArabicFont}
            options={Object.entries(arabicFonts).map(([value, f]) => ({ value, label: f.label }))}
          />
        </SettingsRow>

        <SettingsRow label={t.arabicSize}>
          {/* A slider fills its box; beside the label (sm up) that box shrinks to fit, so it needs a width. */}
          <div className="w-full sm:w-48">
            <Slider
              aria-label={t.arabicSize}
              min={arabicSizeRange.min}
              max={arabicSizeRange.max}
              step={arabicSizeRange.step}
              value={prefs.arabicSize}
              onValueChange={(value) => setPref('arabicSize', Array.isArray(value) ? value[0] : value)}
            />
          </div>
        </SettingsRow>

        <div className="rounded-xl border bg-card px-4 py-5">
          <p
            dir="rtl"
            lang="ar"
            className="text-center font-arabic leading-[2.1]"
            style={{ fontSize: 'var(--arabic-size)' }}>
            {PREVIEW_TEXT}
          </p>
        </div>

        <SettingsRow label={t.wordByWord} hint={t.wordByWordHint}>
          <OnOffChoice label={t.wordByWord} value={prefs.wordByWord} onChange={(on) => setPref('wordByWord', on)} />
        </SettingsRow>

        <SettingsRow label={t.speed} hint={t.speedHint}>
          <ChoiceGroup<string>
            label={t.speed}
            value={String(prefs.playbackRate)}
            onChange={(v) => setPref('playbackRate', Number(v))}
            options={playbackRates.map((rate) => ({ value: String(rate), label: formatRate(rate) }))}
          />
        </SettingsRow>

        <SettingsRow label={t.reciter} htmlFor="setting-reciter">
          <div className="flex items-center gap-2">
            <SettingsSelect
              id="setting-reciter"
              prefKey="reciter"
              parse={Number}
              options={reciters.map((r) => ({ value: String(r.id), label: r.name }))}
            />
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                stop();
                void play(1, 1);
              }}>
              {t.play}
            </Button>
          </div>
        </SettingsRow>

        <SettingsRow label={t.planOnHome} hint={t.planOnHomeHint}>
          <OnOffChoice label={t.planOnHome} value={prefs.planOnHome} onChange={(on) => setPref('planOnHome', on)} />
        </SettingsRow>

        <SettingsRow label={t.prayerReminders} hint={t.prayerRemindersHint}>
          <OnOffChoice
            label={t.prayerReminders}
            value={prayerSettings.reminders}
            onChange={(on) => setPrayerSetting('reminders', on)}
          />
        </SettingsRow>

        <PwaInstallRow />

        <section className="py-6">
          <h2 className="font-serif text-lg">{t.shortcuts}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{t.shortcutHelp}</p>
          <ShortcutList />
        </section>
      </div>
    </PageShell>
  );
}
