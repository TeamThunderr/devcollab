export function formatDate(date: Date | string): string {
  // TODO: format to locale date string
  void date;
  return '';
}

export function formatRelativeTime(date: Date | string): string {
  // TODO: return human-readable relative time (e.g. "2 hours ago")
  void date;
  return '';
}

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
