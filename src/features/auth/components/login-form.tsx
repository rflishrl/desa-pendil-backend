"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircleIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useLogin } from "@/features/auth/hooks";
import { loginSchema, type LoginInput } from "@/features/auth/schemas";

export function LoginForm() {
  const login = useLogin();
  const alertRef = useRef<HTMLDivElement>(null);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // Pesan dari server (mis. password salah) mendapat fokus agar langsung terbaca.
  useEffect(() => {
    if (login.error) alertRef.current?.focus();
  }, [login.error]);

  const busy = login.isPending || login.isSuccess;

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) => login.mutate(values))}
      className="space-y-5"
    >
      {login.error && (
        <Alert variant="destructive" ref={alertRef} tabIndex={-1}>
          <AlertCircleIcon aria-hidden="true" />
          <AlertDescription>{login.error.message}</AlertDescription>
        </Alert>
      )}

      <FieldGroup>
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="login-email">Email</FieldLabel>
              <Input
                {...field}
                id="login-email"
                type="email"
                autoComplete="username"
                required
                aria-invalid={fieldState.invalid}
                aria-describedby={
                  fieldState.invalid ? "login-email-error" : undefined
                }
                className="h-11"
              />
              {fieldState.invalid && (
                <FieldError
                  id="login-email-error"
                  errors={[fieldState.error]}
                />
              )}
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
                required
                aria-invalid={fieldState.invalid}
                aria-describedby={
                  fieldState.invalid ? "login-password-error" : undefined
                }
                className="h-11"
              />
              {fieldState.invalid && (
                <FieldError
                  id="login-password-error"
                  errors={[fieldState.error]}
                />
              )}
            </Field>
          )}
        />
      </FieldGroup>

      <Button type="submit" size="lg" className="h-11 w-full" disabled={busy}>
        {busy ? "Memeriksa..." : "Masuk"}
      </Button>
    </form>
  );
}
