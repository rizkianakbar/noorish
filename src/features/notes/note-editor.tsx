import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Loader2 } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Button } from '#/components/ui/button.tsx';
import { Field, FieldError, FieldLabel } from '#/components/ui/field.tsx';
import { Textarea } from '#/components/ui/textarea.tsx';
import { useT } from '#/lib/i18n.ts';
import { deleteNoteFn, notesQueries, saveNoteFn } from '#/server/notes.functions.ts';
import { noteFormSchema } from './notes.lib.ts';

type NoteEditorProps = {
  surah: number;
  verse: number;
  initialBody: string;
  onDone: () => void;
};

export function NoteEditor(props: NoteEditorProps) {
  const { surah, verse, initialBody, onDone } = props;
  const t = useT();
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof noteFormSchema>>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: { body: initialBody },
  });
  const onSuccess = async () => {
    await queryClient.invalidateQueries({ queryKey: notesQueries.all });
    onDone();
  };

  const save = useMutation({ mutationFn: useServerFn(saveNoteFn), onSuccess });
  const remove = useMutation({ mutationFn: useServerFn(deleteNoteFn), onSuccess });
  const submit = form.handleSubmit(({ body }) => save.mutate({ data: { surah, verse, body } }));
  const fieldId = `note-${surah}-${verse}`;

  return (
    <form className="mt-3 animate-in space-y-2 fade-in slide-in-from-top-1" onSubmit={submit}>
      <Controller
        name="body"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={fieldId} className="sr-only">
              {t.note}
            </FieldLabel>
            <Textarea
              {...field}
              id={fieldId}
              autoFocus
              aria-invalid={fieldState.invalid}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit();
              }}
              placeholder={t.writeNote}
              rows={3}
              maxLength={10000}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      {(save.error || remove.error) && (
        <p className="text-sm text-destructive">{(save.error ?? remove.error)?.message}</p>
      )}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={save.isPending}>
          {save.isPending && <Loader2 className="animate-spin" />}
          {save.isPending ? t.saving : t.save}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          {t.cancel}
        </Button>
        {initialBody && (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="ml-auto"
            disabled={remove.isPending}
            onClick={() => remove.mutate({ data: { surah, verse } })}>
            {t.delete}
          </Button>
        )}
      </div>
    </form>
  );
}
