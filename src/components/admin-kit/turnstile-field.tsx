"use client";

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";

export interface TurnstileFieldHandle {
  reset: () => void;
}

export interface TurnstileFieldProps {
  action: string;
  onToken: (token: string | null) => void;
  mode?: "managed" | "interactive";
  className?: string;
}

// Official Cloudflare Turnstile dummy sitekey for testing/development (always passes)
const DUMMY_ALWAYS_PASS_SITEKEY = "1x00000000000000000000AA";

export const TurnstileField = forwardRef<TurnstileFieldHandle, TurnstileFieldProps>(
  function TurnstileField({ action, onToken, mode = "managed", className }, ref) {
    const turnstileRef = useRef<TurnstileInstance | null>(null);
    const [status, setStatus] = useState<"idle" | "ready" | "success" | "error" | "expired">(
      "idle",
    );

    const siteKey =
      (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() ||
      DUMMY_ALWAYS_PASS_SITEKEY;

    useImperativeHandle(
      ref,
      () => ({
        reset: () => {
          onToken(null);
          setStatus("idle");
          try {
            turnstileRef.current?.reset();
          } catch {
            // Widget might not be fully mounted yet
          }
        },
      }),
      [onToken],
    );

    return (
      <div
        className={className ?? "flex flex-col items-center justify-center py-1"}
        role="region"
        aria-label="Verifikasi Keamanan Cloudflare Turnstile"
      >
        <Turnstile
          ref={turnstileRef}
          siteKey={siteKey}
          options={{
            action,
            theme: "auto",
            appearance: mode === "interactive" ? "interaction-only" : "always",
          }}
          onWidgetLoad={() => {
            setStatus("ready");
          }}
          onSuccess={(token) => {
            setStatus("success");
            onToken(token);
          }}
          onExpire={() => {
            setStatus("expired");
            onToken(null);
          }}
          onError={() => {
            setStatus("error");
            onToken(null);
          }}
        />
        {status === "error" && (
          <p className="mt-1 text-xs text-destructive" role="alert">
            Verifikasi keamanan gagal dimuat. Muat ulang halaman atau periksa koneksi Anda.
          </p>
        )}
        {status === "expired" && (
          <p className="mt-1 text-xs text-muted-foreground" role="alert">
            Verifikasi telah kedaluwarsa. Silakan lakukan verifikasi ulang.
          </p>
        )}
      </div>
    );
  },
);
