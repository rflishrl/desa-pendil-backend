"use client";

import { useActionState } from "react";
import { loginAction, type FormState } from "@/app/admin/actions";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { Field, inputCls, Notice } from "@/components/admin/ui";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<FormState, FormData>(loginAction, {});
  const err = state.errors ?? {};

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />
      {state.message ? <Notice tone="error">{state.message}</Notice> : null}
      <Field label="Email" htmlFor="email" error={err.email}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          aria-invalid={err.email ? true : undefined}
          aria-describedby={err.email ? "email-error" : undefined}
          className={inputCls}
        />
      </Field>
      <Field label="Password" htmlFor="password" error={err.password}>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={err.password ? true : undefined}
          aria-describedby={err.password ? "password-error" : undefined}
          className={inputCls}
        />
      </Field>
      <div className="[&>button]:w-full">
        <SubmitButton pendingLabel="Memeriksa…">Masuk</SubmitButton>
      </div>
    </form>
  );
}
