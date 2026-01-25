import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { nanoid } from 'nanoid'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateUniqueLink() {
  return nanoid(10)
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function formatDateTime(date: Date) {
  const parts = new Intl.DateTimeFormat('fi-FI', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date)

  const dateParts: Record<string, string> = {}
  for (const part of parts) {
    if (part.type !== 'literal') {
      dateParts[part.type] = part.value
    }
  }

  const day = dateParts.day || ''
  const month = dateParts.month || ''
  const year = dateParts.year || ''
  const hour = dateParts.hour || ''
  const minute = dateParts.minute || ''

  return `${day}.${month}.${year} ${hour}:${minute}`.trim()
}

export function formatTime(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function getBaseUrl() {
  if (process.env.APP_URL) return process.env.APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export function generateTimeOptions(stepMinutes = 30) {
  const options: string[] = []
  for (let minutes = 0; minutes < 24 * 60; minutes += stepMinutes) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    const value = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
    options.push(value)
  }
  return options
}
