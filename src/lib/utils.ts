import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "Mi App Genial" -> "mi-app-genial" */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    // Strip the combining marks that NFD just split off (á -> a).
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/** "mi-app-genial" -> "MI_APP_GENIAL" */
export function envName(slug: string): string {
  return slugify(slug).replace(/-/g, '_').toUpperCase() || 'APP';
}
