'use client'

import Link from 'next/link'
import { Heart } from 'lucide-react'

type FooterProps = {
  version?: string
}

export function Footer({ version }: FooterProps) {
  return (
    <footer className="border-t mt-10">
      <div className="container mx-auto px-4 py-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} SlotPoll</span>
          {version && (
            <>
              <span aria-hidden="true">·</span>
              <span>v{version}</span>
            </>
          )}
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/help" className="text-muted-foreground hover:text-foreground">
            Help
          </Link>
          <Link href="/legal" className="text-muted-foreground hover:text-foreground">
            Legal notice
          </Link>
          <Link href="/privacy" className="text-muted-foreground hover:text-foreground">
            Privacy/cookie policy
          </Link>
          <a
            href="https://github.com/sponsors/gezuka77"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-pink-500"
          >
            <Heart className="h-4 w-4 text-pink-500" />
            Sponsor
          </a>
        </nav>
      </div>
    </footer>
  )
}
