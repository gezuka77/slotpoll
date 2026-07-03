'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { Ban, ExternalLink, Lock, Trash2, Unlock } from 'lucide-react'

type AdminUser = {
  id: string
  name: string | null
  email: string | null
  role: 'super_user' | 'admin' | 'normal'
  suspended: boolean
  lastSeenAt: string | null
  pollsCount: number
  votesCount: number
}

type AdminPoll = {
  id: string
  title: string
  uniqueLink: string
  status: 'active' | 'closed' | 'draft'
  creatorName: string | null
  creatorEmail: string | null
  slotsCount: number
  participantsCount: number
  votesCount: number
  closedAt: string | null
  autoClosedAt: string | null
}

type AdminStats = {
  users: AdminMetricStats
  polls: AdminMetricStats
  slots: AdminMetricStats
  participants: AdminMetricStats
  votes: AdminMetricStats
}

type AdminMetricStats = {
  lifetime: number
  active: number
  online?: number
  seenToday?: number
  seenThisWeek?: number
  seenThisMonth?: number
  scheduledDeletion: number
}

type AdminNonUser = {
  email: string
  name: string | null
  pollsVoted: number
}

export function AdminClient({ data }: { data: string }) {
  const parsed = JSON.parse(data) as {
    users: AdminUser[]
    nonUsers: AdminNonUser[]
    demoParticipants: AdminNonUser[]
    polls: AdminPoll[]
    stats: AdminStats
  }
  const { users, nonUsers, demoParticipants, polls, stats } = parsed
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [userQuery, setUserQuery] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'super_user' | 'normal' | 'suspended' | 'online'>('all')
  const [pollQuery, setPollQuery] = useState('')
  const [pollOwnerQuery, setPollOwnerQuery] = useState('')
  const [pollStatusFilter, setPollStatusFilter] = useState<'all' | 'active' | 'closed' | 'draft'>('all')

  const getDaysUntilDeletion = (closedAt: string | null): number | null => {
    if (!closedAt) return null
    const closedDate = new Date(closedAt)
    const deletionDate = new Date(closedDate)
    deletionDate.setDate(deletionDate.getDate() + 30)
    const now = new Date()
    const daysRemaining = Math.ceil((deletionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return daysRemaining
  }

  const isOnline = (lastSeenAt: string | null) => {
    if (!lastSeenAt) return false
    return Date.now() - new Date(lastSeenAt).getTime() <= 5 * 60 * 1000
  }

  const formatLastSeen = (lastSeenAt: string | null) => {
    if (!lastSeenAt) return 'Never seen'
    const date = new Date(lastSeenAt)
    const diffMs = Date.now() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes} min ago`
    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) return `${diffHours} hr ago`
    return date.toLocaleString()
  }

  const mutate = async (id: string, action: () => Promise<Response>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return
    setBusy(id)
    try {
      const res = await action()
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Request failed')
      }
      // Reload the page to show updated data
      window.location.reload()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Request failed')
      setBusy(null)
    }
  }

  const filteredUsers = useMemo(() => {
    const query = userQuery.trim().toLowerCase()
    return users.filter((user) => {
      if (userRoleFilter === 'suspended' && !user.suspended) return false
      if (userRoleFilter === 'online' && !isOnline(user.lastSeenAt)) return false
      if (userRoleFilter === 'super_user' && user.role !== 'super_user') return false
      if (userRoleFilter === 'normal' && user.role !== 'normal') return false

      if (!query) return true
      const haystack = `${user.name || ''} ${user.email || ''}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [users, userQuery, userRoleFilter])

  const filteredPolls = useMemo(() => {
    const query = pollQuery.trim().toLowerCase()
    const ownerQuery = pollOwnerQuery.trim().toLowerCase()
    return polls.filter((poll) => {
      if (pollStatusFilter !== 'all' && poll.status !== pollStatusFilter) return false
      if (query) {
        const text = `${poll.title}`.toLowerCase()
        if (!text.includes(query)) return false
      }
      if (ownerQuery) {
        const owner = `${poll.creatorName || ''} ${poll.creatorEmail || ''}`.toLowerCase()
        if (!owner.includes(ownerQuery)) return false
      }
      return true
    })
  }, [polls, pollQuery, pollOwnerQuery, pollStatusFilter])

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'Users', activeLabel: 'Active', value: stats.users },
          { label: 'Polls', activeLabel: 'Active', value: stats.polls },
          { label: 'Slots', activeLabel: 'Active', value: stats.slots },
          { label: 'Participants', activeLabel: 'Active', value: stats.participants },
          { label: 'Votes', activeLabel: 'Active', value: stats.votes },
        ].map((item) => (
          <Card key={item.label}>
            <CardHeader>
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="text-2xl">{item.value.lifetime}</CardTitle>
              <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
                <div className="flex justify-between gap-3">
                  <span>Lifetime</span>
                  <span className="font-medium text-foreground">{item.value.lifetime}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>{item.activeLabel}</span>
                  <span className="font-medium text-foreground">{item.value.active}</span>
                </div>
                {typeof item.value.online === 'number' && (
                  <div className="flex justify-between gap-3">
                    <span>Online now</span>
                    <span className="font-medium text-foreground">{item.value.online}</span>
                  </div>
                )}
                {typeof item.value.seenToday === 'number' && (
                  <div className="flex justify-between gap-3">
                    <span>Seen today</span>
                    <span className="font-medium text-foreground">{item.value.seenToday}</span>
                  </div>
                )}
                {typeof item.value.seenThisWeek === 'number' && (
                  <div className="flex justify-between gap-3">
                    <span>Seen this week</span>
                    <span className="font-medium text-foreground">{item.value.seenThisWeek}</span>
                  </div>
                )}
                {typeof item.value.seenThisMonth === 'number' && (
                  <div className="flex justify-between gap-3">
                    <span>Seen this month</span>
                    <span className="font-medium text-foreground">{item.value.seenThisMonth}</span>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <span>Scheduled deletion</span>
                  <span className="font-medium text-foreground">{item.value.scheduledDeletion}</span>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Current retained user accounts. Lifetime totals above are anonymous aggregates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search name or email"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              className="max-w-xs"
            />
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value as typeof userRoleFilter)}
            >
              <option value="all">All roles</option>
              <option value="super_user">Super users</option>
              <option value="normal">Normal users</option>
              <option value="suspended">Suspended</option>
              <option value="online">Online now</option>
            </select>
          </div>
          <div className="grid gap-3">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="grid gap-3 rounded-md border p-3 md:grid-cols-[minmax(220px,1fr)_160px_minmax(260px,auto)] md:items-center"
              >
                <div>
                  <div className="font-medium">{user.name || 'No name'}</div>
                  <div className="text-xs text-muted-foreground">{user.email || 'No email'}</div>
                  <div className="text-xs text-muted-foreground">
                    Last seen: {formatLastSeen(user.lastSeenAt)}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground md:text-center">
                  {user.pollsCount} polls • {user.votesCount} polls voted
                </div>
                <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
                  <span
                    className={[
                      'rounded-full border px-2 py-1 text-xs',
                      user.role === 'super_user' && 'border-purple-200 bg-purple-50 text-purple-700',
                      user.role === 'admin' && 'border-blue-200 bg-blue-50 text-blue-700',
                      user.role === 'normal' && 'border-slate-200 bg-slate-50 text-slate-700',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {user.role}
                  </span>
                  {user.suspended && (
                    <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                      suspended
                    </span>
                  )}
                  {isOnline(user.lastSeenAt) && !user.suspended && (
                    <span className="rounded-full border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-700">
                      online
                    </span>
                  )}
                  {user.role !== 'super_user' && user.role !== 'normal' && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === `role-${user.id}`}
                      onClick={() =>
                        mutate(
                          `role-${user.id}`,
                          () =>
                            fetch(`/api/admin/users/${user.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ role: 'normal' }),
                            }),
                          'Set user to normal role?'
                        )
                      }
                    >
                      Make normal
                    </Button>
                  )}
                  {user.role !== 'super_user' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className={
                        user.suspended
                          ? 'border-amber-300 text-amber-700 hover:bg-amber-50'
                          : 'border-amber-300 bg-amber-500 text-white hover:bg-amber-600'
                      }
                      disabled={busy === `suspend-${user.id}`}
                      onClick={() =>
                        mutate(
                          `suspend-${user.id}`,
                          () =>
                            fetch(`/api/admin/users/${user.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ suspended: !user.suspended }),
                            }),
                          user.suspended ? 'Unsuspend this user?' : 'Suspend this user?'
                        )
                      }
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      {user.suspended ? 'Unsuspend' : 'Suspend'}
                    </Button>
                  )}
                  {user.role !== 'super_user' && (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy === `delete-${user.id}`}
                      onClick={() =>
                        mutate(
                          `delete-${user.id}`,
                          () => fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' }),
                          'Delete this user and all their polls/votes?'
                        )
                      }
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Demo poll participants</CardTitle>
          <CardDescription>External emails that voted in the demo poll</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {demoParticipants.length === 0 ? (
            <div className="text-sm text-muted-foreground">No demo participants yet.</div>
          ) : (
            <div className="grid gap-3">
              {demoParticipants.map((participant) => (
                <div
                  key={`demo-${participant.email}`}
                  className="grid gap-3 rounded-md border p-3 md:grid-cols-[minmax(220px,1fr)_160px] md:items-center"
                >
                  <div>
                    <div className="font-medium">{participant.name || 'No name'}</div>
                    <div className="text-xs text-muted-foreground">{participant.email}</div>
                  </div>
                  <div className="text-xs text-muted-foreground md:text-center">
                    {participant.pollsVoted} polls voted
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Participants (no account)</CardTitle>
          <CardDescription>Current retained participant emails that voted but don’t have user accounts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {nonUsers.length === 0 ? (
            <div className="text-sm text-muted-foreground">No external participants yet.</div>
          ) : (
            <div className="grid gap-3">
              {nonUsers.map((participant) => (
                <div
                  key={participant.email}
                  className="grid gap-3 rounded-md border p-3 md:grid-cols-[minmax(220px,1fr)_160px] md:items-center"
                >
                  <div>
                    <div className="font-medium">{participant.name || 'No name'}</div>
                    <div className="text-xs text-muted-foreground">{participant.email}</div>
                  </div>
                  <div className="text-xs text-muted-foreground md:text-center">
                    {participant.pollsVoted} polls voted
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Polls</CardTitle>
          <CardDescription>Current retained polls. Closed polls with deletion timers are counted as scheduled deletion above.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search title"
              value={pollQuery}
              onChange={(e) => setPollQuery(e.target.value)}
              className="max-w-xs"
            />
            <Input
              placeholder="Filter owner"
              value={pollOwnerQuery}
              onChange={(e) => setPollOwnerQuery(e.target.value)}
              className="max-w-xs"
            />
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={pollStatusFilter}
              onChange={(e) => setPollStatusFilter(e.target.value as typeof pollStatusFilter)}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
              <option value="draft">Draft</option>
            </select>
          </div>
          <div className="grid gap-3">
            {filteredPolls.map((poll) => (
              <div key={poll.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                <div className="min-w-[240px]">
                  <div className="font-medium">{poll.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {poll.creatorName || poll.creatorEmail || 'Unknown owner'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {poll.slotsCount} slots • {poll.participantsCount} responses • {poll.votesCount} votes
                  </div>
                  {poll.status === 'closed' && poll.closedAt && (
                    <div className="mt-1 text-xs">
                      {(() => {
                        const daysRemaining = getDaysUntilDeletion(poll.closedAt)
                        if (daysRemaining === null) return null
                        if (daysRemaining <= 0) {
                          return <span className="text-red-600 font-medium">⚠️ Deletion pending</span>
                        }
                        return (
                          <div className="flex flex-col gap-1">
                            {poll.autoClosedAt && (
                              <span className="text-amber-700 font-medium">
                                Automatically closed after all times passed
                              </span>
                            )}
                            <span className={daysRemaining <= 7 ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>
                              🗑️ Auto-delete in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
                            </span>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={[
                      'rounded-full border px-2 py-1 text-xs',
                      poll.status === 'active' && 'border-green-200 bg-green-50 text-green-700',
                      poll.status === 'closed' && 'border-slate-200 bg-slate-50 text-slate-700',
                      poll.status === 'draft' && 'border-amber-200 bg-amber-50 text-amber-700',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {poll.status}
                  </span>
                  {poll.uniqueLink !== 'demo' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className={
                        poll.status === 'closed'
                          ? 'border-green-300 bg-green-600 text-white hover:bg-green-700'
                          : 'border-amber-300 bg-amber-500 text-white hover:bg-amber-600'
                      }
                      disabled={busy === `status-${poll.id}`}
                      onClick={() =>
                        mutate(
                          `status-${poll.id}`,
                          () =>
                            fetch(`/api/admin/polls/${poll.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: poll.status === 'closed' ? 'active' : 'closed' }),
                            }),
                          poll.status === 'closed' ? 'Reopen this poll?' : 'Close this poll?'
                        )
                      }
                    >
                      {poll.status === 'closed' ? (
                        <>
                          <Unlock className="mr-2 h-4 w-4" />
                          Reopen
                        </>
                      ) : (
                        <>
                          <Lock className="mr-2 h-4 w-4" />
                          Close
                        </>
                      )}
                    </Button>
                  )}
                  <Link
                    href={`/polls/${poll.uniqueLink}`}
                    className={[
                      buttonVariants({ variant: 'outline', size: 'sm' }),
                      'border-green-300 bg-green-600 text-white hover:bg-green-700',
                    ].join(' ')}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open
                  </Link>
                  {poll.uniqueLink !== 'demo' && (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy === `delete-${poll.id}`}
                      onClick={() =>
                        mutate(
                          `delete-${poll.id}`,
                          () => fetch(`/api/admin/polls/${poll.id}`, { method: 'DELETE' }),
                          'Delete this poll and all votes?'
                        )
                      }
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
