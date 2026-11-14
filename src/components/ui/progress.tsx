"use client";

import { cn } from "cn";
import type * as React from "react";

interface ProgressProps extends Omit<React.ComponentProps<"progress">, "value" | "max"> {
  value: number;
  max?: number;
}

/** Accessible native horizontal progress bar with configurable track and fill color via `--quota-fill`. */
export function Progress({ value, max = 100, className, ...props }: ProgressProps) {
  const safeMax = max > 0 ? max : 100;
  const safeValue = Math.min(safeMax, Math.max(0, value));

  return (
    <progress
      data-slot="progress"
      value={safeValue}
      max={safeMax}
      className={cn("quota-progress block h-2.5 w-full", className)}
      {...props}
    />
  );
}
