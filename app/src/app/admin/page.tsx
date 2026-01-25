'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AdminClient } from './AdminClient'

type AdminPayload = {
  users: any[]
  polls: any[]
  stats: any
  topSlots: any[]
  activity: any[]
}

export default function AdminPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [payload, setPayload] = useState<AdminPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user || session.user.role !== 'super_user') {
      router.replace('/dashboard')
      return
    }

    const load = async () => {
      try {
        const res = await fetch('/api/admin/overview', { cache: 'no-store' })
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.error || 'Failed to load admin data')
        }
        const data = (await res.json()) as AdminPayload
        setPayload(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load admin data')
      }
    }

    load()
  }, [session, status, router])

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Admin</h1>
          <p className="text-muted-foreground">System-wide management for super admins</p>
        </div>

        {!payload && !error && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">Loading admin data…</CardContent>
          </Card>
        )}

        {error && (
          <Card>
            <CardHeader>
              <CardTitle>Failed to load admin</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{error}</CardContent>
          </Card>
        )}

        {payload && <AdminClient data={JSON.stringify(payload)} />}
      </main>
    </div>
  )
}
