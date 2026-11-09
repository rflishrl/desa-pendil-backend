"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircleIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { TurnstileField, type TurnstileFieldHandle } from "@/components/admin-kit/turnstile-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useLogin } from "@/features/auth/hooks";
import { type LoginInput, loginSchema } from "@/features/auth/schemas";

export function LoginForm() {
  const login = useLogin();
  const alertRef = useRef<HTMLDivElement>(null);
  const turnstileRef = useRef<TurnstileFieldHandle>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", turnstileToken: "" },
  });

  // Keep react-hook-form in sync with Turnstile token
  const handleTurnstileToken = (token: string | null) => {
    setTurnstileToken(token);
    form.setValue("turnstileToken", token ?? "", { shouldValidate: Boolean(token) });
  };

  // Focus server error message so screen readers announce it immediately.
  useEffect(() => {
    if (login.error) alertRef.current?.focus();
  }, [login.error]);

  const busy = login.isPending || login.isSuccess;

  const onSubmit = form.handleSubmit((values) => {
    const token = turnstileToken ?? values.turnstileToken;
    if (!token) {
      form.setError("turnstileToken", {
        type: "manual",
        message: "Selesaikan verifikasi keamanan terlebih dahulu.",
      });
      return;
    }

    login.mutate(
      { ...values, turnstileToken: token },
      {
        onSettled: () => {
          turnstileRef.current?.reset();
        },
      },
    );
  });

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-5">
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
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                required
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.invalid ? "login-email-error" : undefined}
                className="h-11"
              />
              {fieldState.invalid && (
                <FieldError id="login-email-error" errors={[fieldState.error]} />
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
              <div className="relative">
                <Input
                  {...field}
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  enterKeyHint="go"
                  required
                  aria-invalid={fieldState.invalid}
                  aria-describedby={fieldState.invalid ? "login-password-error" : undefined}
                  className="h-11 pr-11"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  aria-pressed={showPassword}
                  className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOffIcon className="size-4" aria-hidden="true" />
                  ) : (
                    <EyeIcon className="size-4" aria-hidden="true" />
                  )}
                </Button>
              </div>
              {fieldState.invalid && (
                <FieldError id="login-password-error" errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />
      </FieldGroup>

      <div className="space-y-1">
        <TurnstileField
          ref={turnstileRef}
          action="login"
          mode="managed"
          onToken={handleTurnstileToken}
        />
        {form.formState.errors.turnstileToken && (
          <p className="text-center text-xs text-destructive" role="alert">
            {form.formState.errors.turnstileToken.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        size="lg"
        className="h-11 w-full"
        disabled={busy || !turnstileToken}
        aria-disabled={busy || !turnstileToken}
      >
        {busy ? "Memeriksa..." : "Masuk"}
      </Button>
    </form>
  );
}
