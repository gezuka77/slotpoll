'use client'

import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t mt-10">
      <div className="container mx-auto px-4 py-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} SlotPoll
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
        </nav>
      </div>
    </footer>
  )
}
