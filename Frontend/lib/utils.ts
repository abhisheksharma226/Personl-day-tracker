import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Return today's date in ISO format (YYYY-MM-DD) using the local timezone.
 *
 * The standard `new Date().toISOString()` uses UTC which can shift the date
 * backwards or forwards depending on the user's timezone. That causes tasks
 * added shortly after midnight to land on the wrong day. This helper ensures
 * we use the *local* date instead.
 */
export function getLocalIsoDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
