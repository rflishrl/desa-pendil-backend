"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
}

export function CopyButton({ value, label, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`Tersalin: ${value}`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Gagal menyalin ke clipboard");
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      onClick={handleCopy}
      aria-label={`Salin ${label ?? value}`}
      className={className}
    >
      {copied ? (
        <CheckIcon className="size-3 text-success" aria-hidden="true" />
      ) : (
        <CopyIcon
          className="size-3 text-muted-foreground hover:text-foreground"
          aria-hidden="true"
        />
      )}
    </Button>
  );
}
