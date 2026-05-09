"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  showValue?: boolean;
}

export function Progress({
  value = 0,
  max = 100,
  showValue = false,
  className,
  ...props
}: ProgressProps) {
  const clampedMax = max <= 0 ? 100 : max;
  const clampedValue = Math.min(Math.max(value, 0), clampedMax);
  const percentage = (clampedValue / clampedMax) * 100;

  return (
    <div className="relative w-full">
      <div
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={clampedMax}
        className={cn(
          "h-2.5 w-full overflow-hidden rounded-full bg-muted/50 backdrop-blur-sm",
          className,
        )}
        {...props}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] transition-all duration-500 ease-out animate-gradient shadow-sm shadow-primary/30"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showValue && (
        <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[calc(100%+0.5rem)] text-xs font-medium text-muted-foreground">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}
