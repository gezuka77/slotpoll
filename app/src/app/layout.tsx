import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Footer } from '@/components/footer'
import packageJson from '../../package.json'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SlotPoll - Simple Scheduling & Polling',
  description: 'A lightweight, self-hosted alternative to Doodle for team scheduling and polling.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="stylesheet" href="/vendor/daypilot/daypilot.css" />
      </head>
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <div className="flex-1">{children}</div>
            <Footer version={packageJson.version} />
          </div>
        </Providers>
      </body>
    </html>
  )
}
