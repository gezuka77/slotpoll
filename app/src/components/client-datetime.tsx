'use client'

import { useEffect, useState } from 'react'
import { formatDateTime } from '@/lib/utils'

export function ClientDateTime({ value }: { value: Date | string }) {
  const [text, setText] = useState('')

  useEffect(() => {
    const date = value instanceof Date ? value : new Date(value)
    setText(formatDateTime(date))
  }, [value])

  return <span suppressHydrationWarning title="Shown in your local timezone">{text}</span>
}
