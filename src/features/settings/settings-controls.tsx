import type { ReactNode } from 'react';
import { ChoiceSelect } from '#/components/choice-select.tsx';
import { Field, FieldContent, FieldDescription, FieldLabel, FieldTitle } from '#/components/ui/field.tsx';
import { type Prefs, setPref, usePrefs } from '#/lib/prefs.ts';

type SettingsRowProps = {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
};

/**
 * One setting: its name and hint beside the control on wide screens, above
 * it on phones. With `htmlFor` the name is a real label for that control;
 * without (a group of choices) it is a title, and the control names itself.
 */
export function SettingsRow(props: SettingsRowProps) {
  const { label, hint, htmlFor, children } = props;
  return (
    // Field stacks and stretches its children (*:w-full); side by side from sm up they must
    // size themselves, or the name and the control squeeze each other.
    <Field className="gap-2 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:*:w-auto">
      <FieldContent>
        {htmlFor ? <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel> : <FieldTitle>{label}</FieldTitle>}
        {hint && <FieldDescription className="text-xs">{hint}</FieldDescription>}
      </FieldContent>
      <div className="shrink-0">{children}</div>
    </Field>
  );
}

type SettingsSelectProps<K extends keyof Prefs> = {
  id: string;
  prefKey: K;
  options: { value: string; label: string }[];
  parse: (raw: string) => Prefs[K];
};

/**
 * A select bound straight to one preference.
 */
export function SettingsSelect<K extends keyof Prefs>(props: SettingsSelectProps<K>) {
  const { id, prefKey, options, parse } = props;
  const prefs = usePrefs();
  return (
    <ChoiceSelect
      id={id}
      value={String(prefs[prefKey])}
      options={options}
      onChange={(value) => setPref(prefKey, parse(value))}
    />
  );
}
