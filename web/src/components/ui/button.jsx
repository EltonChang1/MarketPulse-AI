import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "rounded-full bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-gradient-to-br dark:from-zinc-100 dark:to-zinc-300 dark:text-black dark:hover:from-zinc-200 dark:hover:to-zinc-400",
        destructive: "rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "rounded-full border border-input bg-background hover:bg-accent hover:text-accent-foreground dark:border-[#333] dark:bg-[rgba(31,31,31,0.62)] dark:text-zinc-300 dark:hover:border-white/50 dark:hover:text-white dark:hover:bg-[rgba(31,31,31,0.72)]",
        secondary:
          "rounded-full border border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 dark:border-[#333] dark:bg-[rgba(255,255,255,0.06)] dark:hover:bg-[rgba(255,255,255,0.1)]",
        ghost: "rounded-full hover:bg-accent hover:text-accent-foreground dark:hover:bg-white/10",
        link: "rounded-none text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-full px-3",
        lg: "h-11 rounded-full px-8",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Button = React.forwardRef(function Button(
  { className, variant, size, asChild = false, ...props },
  ref
) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});

export { Button, buttonVariants };
