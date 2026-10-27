import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '#/components/ui/button.tsx';
import { Field, FieldError, FieldGroup, FieldLabel } from '#/components/ui/field.tsx';
import { Input } from '#/components/ui/input.tsx';
import { requestPlanSync } from '#/features/plans/plans.hooks.ts';
import { authClient } from '#/lib/auth-client.ts';
import { type LoginValues, loginSchema } from './auth.lib.ts';

export function LoginPage() {
  const navigate = useNavigate();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    // Prefill the seeded account (`bun db:seed`) in dev only.
    defaultValues: import.meta.env.DEV
      ? { email: 'test@example.com', password: 'password123' }
      : { email: '', password: '' },
  });

  const signIn = useMutation({
    mutationFn: async (values: LoginValues) => {
      const result = await authClient.signIn.email(values);
      if (result.error) throw new Error(result.error.message || 'Login failed');
    },
    onSuccess: () => {
      requestPlanSync();
      void navigate({ to: '/' });
    },
  });

  return (
    <main id="main-content" className="flex min-w-0 grow items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 rounded-xl border bg-card p-8 text-card-foreground">
        <div>
          <h2 className="text-center text-3xl font-bold tracking-tight">Noorish</h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        <form className="space-y-6" noValidate onSubmit={form.handleSubmit((values) => signIn.mutate(values))}>
          {signIn.error && (
            <div role="alert" className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
              {signIn.error.message}
            </div>
          )}

          <FieldGroup>
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="login-email">Email address</FieldLabel>
                  <Input
                    {...field}
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    aria-invalid={fieldState.invalid}
                    className="h-10"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="login-password">Password</FieldLabel>
                  <Input
                    {...field}
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    aria-invalid={fieldState.invalid}
                    className="h-10"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>

          <Button type="submit" size="lg" className="h-10 w-full" disabled={signIn.isPending}>
            {signIn.isPending && <Loader2 className="animate-spin" />}
            {signIn.isPending ? 'Signing in…' : 'Sign in'}
          </Button>

          {import.meta.env.DEV && (
            <p className="text-center text-xs text-muted-foreground">
              Test credentials: test@example.com / password123
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
