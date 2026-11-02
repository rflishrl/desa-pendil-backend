"use client";

import { useFormStatus } from "react-dom";
import { btn } from "@/components/admin/ui";

/** Submit button that disables itself and shows progress while the server action runs. */
export function SubmitButton({
  children,
  pendingLabel = "Menyimpan…",
  variant = "primary",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: keyof typeof btn;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-disabled={pending} className={btn[variant]}>
      {pending ? pendingLabel : children}
    </button>
  );
}
