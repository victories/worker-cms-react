import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | null, lang: string = 'tr'): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | null, lang: string = 'tr'): string {
  if (!date) return '-';
  return new Date(date).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Convert R2 key to a URL that works from both admin panel and public sites.
 * r2_key format: "sites/{siteId}/uploads/2026/02/file.jpg"
 * Output: "/uploads/s/{siteId}/2026/02/file.jpg"
 */
export function mediaUrl(r2Key: string): string {
  // r2_key: sites/1/uploads/2026/02/file.jpg → /uploads/s/1/2026/02/file.jpg
  const match = r2Key.match(/^sites\/(\d+)\/uploads\/(.+)$/);
  if (match) {
    return `/uploads/s/${match[1]}/${match[2]}`;
  }
  // Fallback
  return `/uploads/${r2Key}`;
}
