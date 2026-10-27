import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { cn } from '#/lib/utils.ts';
import type { ChoiceOption } from './choice-group.tsx';

export interface ChoiceSelectProps<T extends string | number> {
  /**
   * Links a FieldLabel's htmlFor to the trigger.
   */
  id?: string;
  /**
   * Accessible name when there is no visible label.
   */
  label?: string;
  value: T;
  options: ChoiceOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}

/**
 * Pick one of many options from a list: shadcn's select, with the chosen
 * option's label shown in the trigger.
 */
export function ChoiceSelect<T extends string | number>(props: ChoiceSelectProps<T>) {
  const { id, label, value, options, onChange, className } = props;
  return (
    <Select<T> items={options} value={value} onValueChange={(next) => next !== null && onChange(next)}>
      <SelectTrigger id={id} aria-label={label} className={cn('pressable h-9 min-w-40', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={String(option.value)} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
