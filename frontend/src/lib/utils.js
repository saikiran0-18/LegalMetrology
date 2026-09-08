import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Universal image URL resolver for uploaded product packages & evidence crops.
 * Handles:
 * - Absolute system paths (e.g. C:/.../uploads/filename.jpg)
 * - Relative paths with or without leading slash (uploads/xxx.png or /uploads/xxx.png)
 * - Raw filenames (xxx.png)
 * - Full remote URLs (http:// or https:// or data:)
 */
export function getImageUrl(imagePath) {
  if (!imagePath) return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('data:')) {
    return imagePath;
  }

  // Normalize backslashes to slashes
  const normalized = imagePath.replace(/\\/g, '/');

  let relativePath = normalized;
  if (normalized.includes('/uploads/')) {
    relativePath = normalized.substring(normalized.indexOf('/uploads/'));
  } else if (normalized.startsWith('uploads/')) {
    relativePath = '/' + normalized;
  } else if (normalized.includes('uploads/')) {
    relativePath = '/' + normalized.substring(normalized.indexOf('uploads/'));
  } else if (!normalized.startsWith('/')) {
    relativePath = '/uploads/' + normalized;
  }

  // Ensure single leading slash
  if (!relativePath.startsWith('/')) {
    relativePath = '/' + relativePath;
  }

  // Strip trailing slashes from API_URL
  const baseUrl = (API_URL || '').replace(/\/+$/, '');
  return `${baseUrl}${relativePath}`;
}
