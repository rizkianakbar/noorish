import type { ReactNode } from 'react';
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group.tsx';
import { useT } from '#/lib/i18n.ts';
import { cn } from '#/lib/utils.ts';

export interface ChoiceOption<T> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export interface ChoiceGroupProps<T extends string | number> {
  /**
   * Names the group for assistive tech; the visible label is the caller's.
   */
  label: string;
  value: T;
  options: ChoiceOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}

/**
 * Pick one of a few options, all in view: shadcn's toggle group, single
 * choice. Pressing the chosen option again keeps it (Base UI would clear it).
 */
export function ChoiceGroup<T extends string | number>(props: ChoiceGroupProps<T>) {
  const { label, value, options, onChange, className } = props;
  return (
    <ToggleGroup
      aria-label={label}
      variant="outline"
      size="sm"
      spacing={1.5}
      value={[String(value)]}
      onValueChange={(next) => {
        const picked = options.find((option) => String(option.value) === next[0]);
        if (picked) onChange(picked.value);
      }}
      className={cn('flex-wrap', className)}>
      {options.map((option) => (
        <ToggleGroupItem
          key={String(option.value)}
          value={String(option.value)}
          className="rounded-full px-3 tabular-nums">
          {option.icon}
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

type OnOffChoiceProps = {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

/**
 * The common On / Off choice.
 */
export function OnOffChoice(props: OnOffChoiceProps) {
  const t = useT();
  return (
    <ChoiceGroup
      label={props.label}
      value={props.value ? 'on' : 'off'}
      onChange={(choice) => props.onChange(choice === 'on')}
      options={[
        { value: 'on', label: t.on },
        { value: 'off', label: t.translationOff },
      ]}
    />
  );
}
