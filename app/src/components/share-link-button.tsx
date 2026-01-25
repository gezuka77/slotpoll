'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, Link2 } from 'lucide-react'

export function ShareLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
      window.prompt('Copy this share link:', url)
    }
  }

  return (
    <Button onClick={handleCopy} variant="outline" className="gap-2">
      {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
      {copied ? 'Copied' : 'Share poll'}
    </Button>
  )
}
