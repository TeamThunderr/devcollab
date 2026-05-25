import { Message } from '../stores/chatStore';

export function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatDateSeparator(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (isSameDay(dateString, now.toISOString())) {
    return 'Today';
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(dateString, yesterday.toISOString())) {
    return 'Yesterday';
  }

  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'long' });
  }

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  }

  return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

export function isSameDay(a: string, b: string): boolean {
  const dateA = new Date(a);
  const dateB = new Date(b);
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

export function isSameGroup(a: Message, b: Message): boolean {
  // Returns true if a and b should be grouped together (a follows b, or b follows a)
  // Assuming a is older, b is newer.
  
  if (a.senderId !== b.senderId) return false;
  if (!isSameDay(a.createdAt, b.createdAt)) return false;
  
  const timeA = new Date(a.createdAt).getTime();
  const timeB = new Date(b.createdAt).getTime();
  const diffMinutes = Math.abs(timeA - timeB) / (1000 * 60);
  
  return diffMinutes < 5;
}
