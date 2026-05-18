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

export function cn(...classes: (string | undefined | null | false)[]): string {
  // TODO: filter and join class names (classnames helper)
  return classes.filter(Boolean).join(' ');
}
