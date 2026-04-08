import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes — shadcn-style helper for new UI. */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
