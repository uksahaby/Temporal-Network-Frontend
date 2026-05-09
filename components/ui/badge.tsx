import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-300",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-sm shadow-primary/25",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline:
          "border-border/50 bg-background/50 backdrop-blur-sm text-foreground hover:bg-accent/50",
        success:
          "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400",
        warning:
          "border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
        destructive:
          "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
        info: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
