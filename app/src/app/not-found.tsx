import Link from 'next/link'
import { Header } from '@/components/header'

export default function NotFound() {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Page not found</h2>
          <p className="text-muted-foreground">The page you are looking for does not exist.</p>
          <Link
            href="/"
            className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
