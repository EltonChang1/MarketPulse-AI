import * as React from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }) {
  return (
    <div
      data-slot="card"
      className={cn(
        "flex flex-col gap-6 rounded-xl border border-border bg-card text-card-foreground shadow-card",
        "dark:border-[#333] dark:bg-[rgba(31,31,31,0.65)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.35)] dark:backdrop-blur-sm",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }) {
  return (
    <div
      data-slot="card-header"
      className={cn("grid auto-rows-min items-start gap-1.5 px-6 pt-6", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }) {
  return <div data-slot="card-title" className={cn("leading-none font-semibold", className)} {...props} />;
}

function CardDescription({ className, ...props }) {
  return <div data-slot="card-description" className={cn("text-muted-foreground text-sm", className)} {...props} />;
}

function CardContent({ className, ...props }) {
  return <div data-slot="card-content" className={cn("px-6 pb-6", className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
