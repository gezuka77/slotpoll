'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Ban, ExternalLink, Lock, Trash2, Unlock } from 'lucide-react'

type AdminUser = {
  id: string
  name: string | null
  email: string | null
  role: 'super_user' | 'admin' | 'normal'
  suspended: boolean
  lastSeenAt: string | null
  createdAt: string
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
  createdAt: string
}

type AdminStats = {
  users: AdminMetricStats
  polls: AdminMetricStats
  slots: AdminMetricStats
  participants: AdminMetricStats
  votes: AdminMetricStats
}

type TrendRange = 'daily' | 'weekly' | 'monthly'

type TrendPoint = {
  label: string
  value: number
}

type AdminMetricStats = {
  lifetime: number
  active: number
  online?: number
  seenToday?: number
  seenThisWeek?: number
  seenThisMonth?: number
  scheduledDeletion: number
  trend: Record<TrendRange, TrendPoint[]>
}

type AdminNonUser = {
  email: string
  name: string | null
  pollsVoted: number
  lastSeenAt: string | null
}

type SortDirection = 'asc' | 'desc'
type UserSort = 'name' | 'email' | 'role' | 'lastSeen' | 'created' | 'polls' | 'votes'
type ParticipantSort = 'name' | 'email' | 'lastSeen' | 'pollsVoted'
type PollSort = 'title' | 'owner' | 'status' | 'created' | 'slots' | 'participants' | 'votes' | 'deletion'

const trendRangeOptions: Array<{ value: TrendRange; label: string; description: string }> = [
  { value: 'daily', label: 'Daily', description: 'Last 14 days' },
  { value: 'weekly', label: 'Weekly', description: 'Last 12 weeks' },
  { value: 'monthly', label: 'Monthly', description: 'Last 12 months' },
]

function MetricChart({
  range,
  points,
}: {
  range: TrendRange
  points: TrendPoint[]
}) {
  const maxValue = Math.max(...points.map((point) => point.value), 0)
  const total = points.reduce((sum, point) => sum + point.value, 0)
  const rangeLabel = trendRangeOptions.find((option) => option.value === range)?.description || ''

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>Created</span>
        <span className="font-medium text-foreground">{total}</span>
      </div>
      <div className="flex h-14 items-end gap-1.5 rounded-md bg-muted/30 px-1.5 pb-1.5 pt-2">
        {points.map((point) => {
          const height = maxValue > 0 ? Math.max(6, Math.round((point.value / maxValue) * 44)) : 3
          return (
            <div key={`${range}-${point.label}`} className="flex h-11 min-w-0 flex-1 items-end">
              <div
                className="w-full rounded-sm bg-primary/65 transition-colors hover:bg-primary"
                style={{ height }}
                title={`${point.label}: ${point.value}`}
              />
            </div>
          )
        })}
      </div>
      <div className="flex items-center justify-between gap-3 text-[11px] leading-4 text-muted-foreground">
        <span>{rangeLabel}</span>
        <span title="These bars use each record's createdAt timestamp.">createdAt</span>
      </div>
    </div>
  )
}

function compareText(a: string | null | undefined, b: string | null | undefined) {
  return (a || '').localeCompare(b || '', undefined, { sensitivity: 'base' })
}

function compareNumber(a: number, b: number) {
  return a - b
}

function dateTime(value: string | null | undefined) {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

function applyDirection(value: number, direction: SortDirection) {
  return direction === 'asc' ? value : -value
}

function SortHeader({
  label,
  active,
  direction,
  onClick,
  align = 'left',
}: {
  label: string
  active: boolean
  direction: SortDirection
  onClick: () => void
  align?: 'left' | 'right'
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex w-full items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground',
        align === 'right' && 'justify-end text-right'
      )}
      onClick={onClick}
    >
      <span>{label}</span>
      <span className="w-8 text-[10px]">{active ? direction : ''}</span>
    </button>
  )
}

function PaginationControls({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, pageCount)
  const start = total === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const end = Math.min(total, currentPage * pageSize)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-sm text-muted-foreground">
      <div>
        Showing {start}-{end} of {total}
      </div>
      <div className="flex items-center gap-2">
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          <option value={25}>25 rows</option>
          <option value={50}>50 rows</option>
          <option value={100}>100 rows</option>
        </select>
        <Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>
          Previous
        </Button>
        <span className="min-w-16 text-center text-xs">
          {currentPage} / {pageCount}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={currentPage >= pageCount}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  return items.slice((currentPage - 1) * pageSize, currentPage * pageSize)
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
  const [trendRange, setTrendRange] = useState<TrendRange>('daily')
  const [pageSize, setPageSize] = useState(25)
  const [userPage, setUserPage] = useState(1)
  const [demoParticipantPage, setDemoParticipantPage] = useState(1)
  const [participantPage, setParticipantPage] = useState(1)
  const [pollPage, setPollPage] = useState(1)
  const [userSort, setUserSort] = useState<{ key: UserSort; direction: SortDirection }>({
    key: 'lastSeen',
    direction: 'desc',
  })
  const [demoParticipantSort, setDemoParticipantSort] = useState<{
    key: ParticipantSort
    direction: SortDirection
  }>({ key: 'lastSeen', direction: 'desc' })
  const [participantSort, setParticipantSort] = useState<{ key: ParticipantSort; direction: SortDirection }>({
    key: 'lastSeen',
    direction: 'desc',
  })
  const [pollSort, setPollSort] = useState<{ key: PollSort; direction: SortDirection }>({
    key: 'created',
    direction: 'desc',
  })

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

  const setSharedPageSize = (nextPageSize: number) => {
    setPageSize(nextPageSize)
    setUserPage(1)
    setDemoParticipantPage(1)
    setParticipantPage(1)
    setPollPage(1)
  }

  const toggleUserSort = (key: UserSort) => {
    setUserPage(1)
    setUserSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const toggleDemoParticipantSort = (key: ParticipantSort) => {
    setDemoParticipantPage(1)
    setDemoParticipantSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const toggleParticipantSort = (key: ParticipantSort) => {
    setParticipantPage(1)
    setParticipantSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const togglePollSort = (key: PollSort) => {
    setPollPage(1)
    setPollSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const sortedUsers = useMemo(() => {
    const query = userQuery.trim().toLowerCase()
    return users
      .filter((user) => {
        if (userRoleFilter === 'suspended' && !user.suspended) return false
        if (userRoleFilter === 'online' && !isOnline(user.lastSeenAt)) return false
        if (userRoleFilter === 'super_user' && user.role !== 'super_user') return false
        if (userRoleFilter === 'normal' && user.role !== 'normal') return false

        if (!query) return true
        const haystack = `${user.name || ''} ${user.email || ''}`.toLowerCase()
        return haystack.includes(query)
      })
      .sort((a, b) => {
        const compare =
          userSort.key === 'name'
            ? compareText(a.name, b.name)
            : userSort.key === 'email'
              ? compareText(a.email, b.email)
              : userSort.key === 'role'
                ? compareText(a.role, b.role)
                : userSort.key === 'lastSeen'
                  ? compareNumber(dateTime(a.lastSeenAt), dateTime(b.lastSeenAt))
                  : userSort.key === 'created'
                    ? compareNumber(dateTime(a.createdAt), dateTime(b.createdAt))
                    : userSort.key === 'polls'
                      ? compareNumber(a.pollsCount, b.pollsCount)
                      : compareNumber(a.votesCount, b.votesCount)
        return applyDirection(compare, userSort.direction)
      })
  }, [users, userQuery, userRoleFilter, userSort])

  const sortedDemoParticipants = useMemo(() => {
    return [...demoParticipants].sort((a, b) => {
      const compare =
        demoParticipantSort.key === 'name'
          ? compareText(a.name, b.name)
          : demoParticipantSort.key === 'email'
            ? compareText(a.email, b.email)
            : demoParticipantSort.key === 'lastSeen'
              ? compareNumber(dateTime(a.lastSeenAt), dateTime(b.lastSeenAt))
              : compareNumber(a.pollsVoted, b.pollsVoted)
      return applyDirection(compare, demoParticipantSort.direction)
    })
  }, [demoParticipants, demoParticipantSort])

  const sortedParticipants = useMemo(() => {
    return [...nonUsers].sort((a, b) => {
      const compare =
        participantSort.key === 'name'
          ? compareText(a.name, b.name)
          : participantSort.key === 'email'
            ? compareText(a.email, b.email)
            : participantSort.key === 'lastSeen'
              ? compareNumber(dateTime(a.lastSeenAt), dateTime(b.lastSeenAt))
              : compareNumber(a.pollsVoted, b.pollsVoted)
      return applyDirection(compare, participantSort.direction)
    })
  }, [nonUsers, participantSort])

  const sortedPolls = useMemo(() => {
    const query = pollQuery.trim().toLowerCase()
    const ownerQuery = pollOwnerQuery.trim().toLowerCase()
    return polls
      .filter((poll) => {
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
      .sort((a, b) => {
        const compare =
          pollSort.key === 'title'
            ? compareText(a.title, b.title)
            : pollSort.key === 'owner'
              ? compareText(a.creatorName || a.creatorEmail, b.creatorName || b.creatorEmail)
              : pollSort.key === 'status'
                ? compareText(a.status, b.status)
                : pollSort.key === 'created'
                  ? compareNumber(dateTime(a.createdAt), dateTime(b.createdAt))
                  : pollSort.key === 'slots'
                    ? compareNumber(a.slotsCount, b.slotsCount)
                    : pollSort.key === 'participants'
                      ? compareNumber(a.participantsCount, b.participantsCount)
                      : pollSort.key === 'votes'
                        ? compareNumber(a.votesCount, b.votesCount)
                        : compareNumber(getDaysUntilDeletion(a.closedAt) ?? Number.MAX_SAFE_INTEGER, getDaysUntilDeletion(b.closedAt) ?? Number.MAX_SAFE_INTEGER)
        return applyDirection(compare, pollSort.direction)
      })
  }, [polls, pollQuery, pollOwnerQuery, pollStatusFilter, pollSort])

  const paginatedUsers = paginate(sortedUsers, userPage, pageSize)
  const paginatedDemoParticipants = paginate(sortedDemoParticipants, demoParticipantPage, pageSize)
  const paginatedParticipants = paginate(sortedParticipants, participantPage, pageSize)
  const paginatedPolls = paginate(sortedPolls, pollPage, pageSize)

  const metricCards = [
    { label: 'Users', activeLabel: 'Active', value: stats.users },
    { label: 'Polls', activeLabel: 'Active', value: stats.polls },
    { label: 'Slots', activeLabel: 'Active', value: stats.slots },
    { label: 'Participants', activeLabel: 'Active', value: stats.participants },
    { label: 'Votes', activeLabel: 'Active', value: stats.votes },
  ]

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <div className="inline-flex rounded-md border bg-background p-1">
          {trendRangeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(
                'h-8 rounded px-3 text-sm font-medium text-muted-foreground transition-colors',
                trendRange === option.value && 'bg-primary text-primary-foreground shadow-sm'
              )}
              onClick={() => setTrendRange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {metricCards.map((item) => (
          <Card key={item.label} className="overflow-hidden">
            <CardHeader className="pb-4 md:h-[300px]">
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
            <CardContent className="border-t px-6 pb-5 pt-4">
              <MetricChart range={trendRange} points={item.value.trend[trendRange] || []} />
            </CardContent>
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
              onChange={(e) => {
                setUserPage(1)
                setUserQuery(e.target.value)
              }}
              className="max-w-xs"
            />
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={userRoleFilter}
              onChange={(e) => {
                setUserPage(1)
                setUserRoleFilter(e.target.value as typeof userRoleFilter)
              }}
            >
              <option value="all">All roles</option>
              <option value="super_user">Super users</option>
              <option value="normal">Normal users</option>
              <option value="suspended">Suspended</option>
              <option value="online">Online now</option>
            </select>
          </div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="bg-muted/40">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left">
                    <SortHeader label="Name" active={userSort.key === 'name'} direction={userSort.direction} onClick={() => toggleUserSort('name')} />
                  </th>
                  <th className="px-3 py-2 text-left">
                    <SortHeader label="Email" active={userSort.key === 'email'} direction={userSort.direction} onClick={() => toggleUserSort('email')} />
                  </th>
                  <th className="px-3 py-2 text-left">
                    <SortHeader label="Role" active={userSort.key === 'role'} direction={userSort.direction} onClick={() => toggleUserSort('role')} />
                  </th>
                  <th className="px-3 py-2 text-left">
                    <SortHeader label="Last seen" active={userSort.key === 'lastSeen'} direction={userSort.direction} onClick={() => toggleUserSort('lastSeen')} />
                  </th>
                  <th className="px-3 py-2 text-right">
                    <SortHeader label="Polls" active={userSort.key === 'polls'} direction={userSort.direction} onClick={() => toggleUserSort('polls')} align="right" />
                  </th>
                  <th className="px-3 py-2 text-right">
                    <SortHeader label="Voted" active={userSort.key === 'votes'} direction={userSort.direction} onClick={() => toggleUserSort('votes')} align="right" />
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr key={user.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium">{user.name || 'No name'}</td>
                    <td className="px-3 py-2 text-muted-foreground">{user.email || 'No email'}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <span
                          className={cn(
                            'rounded-full border px-2 py-1 text-xs',
                            user.role === 'super_user' && 'border-purple-200 bg-purple-50 text-purple-700',
                            user.role === 'admin' && 'border-blue-200 bg-blue-50 text-blue-700',
                            user.role === 'normal' && 'border-slate-200 bg-slate-50 text-slate-700'
                          )}
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
                      </div>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{formatLastSeen(user.lastSeenAt)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{user.pollsCount}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{user.votesCount}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-2">
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
                            Normal
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
                            <Ban className="h-4 w-4" />
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
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={userPage}
            pageSize={pageSize}
            total={sortedUsers.length}
            onPageChange={setUserPage}
            onPageSizeChange={setSharedPageSize}
          />
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
            <>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-muted/40">
                    <tr className="border-b">
                      <th className="px-3 py-2 text-left">
                        <SortHeader label="Name" active={demoParticipantSort.key === 'name'} direction={demoParticipantSort.direction} onClick={() => toggleDemoParticipantSort('name')} />
                      </th>
                      <th className="px-3 py-2 text-left">
                        <SortHeader label="Email" active={demoParticipantSort.key === 'email'} direction={demoParticipantSort.direction} onClick={() => toggleDemoParticipantSort('email')} />
                      </th>
                      <th className="px-3 py-2 text-left">
                        <SortHeader label="Last response" active={demoParticipantSort.key === 'lastSeen'} direction={demoParticipantSort.direction} onClick={() => toggleDemoParticipantSort('lastSeen')} />
                      </th>
                      <th className="px-3 py-2 text-right">
                        <SortHeader label="Polls voted" active={demoParticipantSort.key === 'pollsVoted'} direction={demoParticipantSort.direction} onClick={() => toggleDemoParticipantSort('pollsVoted')} align="right" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDemoParticipants.map((participant) => (
                      <tr key={`demo-${participant.email}`} className="border-b last:border-0">
                        <td className="px-3 py-2 font-medium">{participant.name || 'No name'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{participant.email}</td>
                        <td className="px-3 py-2 text-muted-foreground">{formatLastSeen(participant.lastSeenAt)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{participant.pollsVoted}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationControls
                page={demoParticipantPage}
                pageSize={pageSize}
                total={sortedDemoParticipants.length}
                onPageChange={setDemoParticipantPage}
                onPageSizeChange={setSharedPageSize}
              />
            </>
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
            <>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-muted/40">
                    <tr className="border-b">
                      <th className="px-3 py-2 text-left">
                        <SortHeader label="Name" active={participantSort.key === 'name'} direction={participantSort.direction} onClick={() => toggleParticipantSort('name')} />
                      </th>
                      <th className="px-3 py-2 text-left">
                        <SortHeader label="Email" active={participantSort.key === 'email'} direction={participantSort.direction} onClick={() => toggleParticipantSort('email')} />
                      </th>
                      <th className="px-3 py-2 text-left">
                        <SortHeader label="Last response" active={participantSort.key === 'lastSeen'} direction={participantSort.direction} onClick={() => toggleParticipantSort('lastSeen')} />
                      </th>
                      <th className="px-3 py-2 text-right">
                        <SortHeader label="Polls voted" active={participantSort.key === 'pollsVoted'} direction={participantSort.direction} onClick={() => toggleParticipantSort('pollsVoted')} align="right" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedParticipants.map((participant) => (
                      <tr key={participant.email} className="border-b last:border-0">
                        <td className="px-3 py-2 font-medium">{participant.name || 'No name'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{participant.email}</td>
                        <td className="px-3 py-2 text-muted-foreground">{formatLastSeen(participant.lastSeenAt)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{participant.pollsVoted}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationControls
                page={participantPage}
                pageSize={pageSize}
                total={sortedParticipants.length}
                onPageChange={setParticipantPage}
                onPageSizeChange={setSharedPageSize}
              />
            </>
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
              onChange={(e) => {
                setPollPage(1)
                setPollQuery(e.target.value)
              }}
              className="max-w-xs"
            />
            <Input
              placeholder="Filter owner"
              value={pollOwnerQuery}
              onChange={(e) => {
                setPollPage(1)
                setPollOwnerQuery(e.target.value)
              }}
              className="max-w-xs"
            />
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={pollStatusFilter}
              onChange={(e) => {
                setPollPage(1)
                setPollStatusFilter(e.target.value as typeof pollStatusFilter)
              }}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
              <option value="draft">Draft</option>
            </select>
          </div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[1120px] text-sm">
              <thead className="bg-muted/40">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left">
                    <SortHeader label="Title" active={pollSort.key === 'title'} direction={pollSort.direction} onClick={() => togglePollSort('title')} />
                  </th>
                  <th className="px-3 py-2 text-left">
                    <SortHeader label="Owner" active={pollSort.key === 'owner'} direction={pollSort.direction} onClick={() => togglePollSort('owner')} />
                  </th>
                  <th className="px-3 py-2 text-left">
                    <SortHeader label="Status" active={pollSort.key === 'status'} direction={pollSort.direction} onClick={() => togglePollSort('status')} />
                  </th>
                  <th className="px-3 py-2 text-right">
                    <SortHeader label="Slots" active={pollSort.key === 'slots'} direction={pollSort.direction} onClick={() => togglePollSort('slots')} align="right" />
                  </th>
                  <th className="px-3 py-2 text-right">
                    <SortHeader label="Responses" active={pollSort.key === 'participants'} direction={pollSort.direction} onClick={() => togglePollSort('participants')} align="right" />
                  </th>
                  <th className="px-3 py-2 text-right">
                    <SortHeader label="Votes" active={pollSort.key === 'votes'} direction={pollSort.direction} onClick={() => togglePollSort('votes')} align="right" />
                  </th>
                  <th className="px-3 py-2 text-left">
                    <SortHeader label="Deletion" active={pollSort.key === 'deletion'} direction={pollSort.direction} onClick={() => togglePollSort('deletion')} />
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPolls.map((poll) => {
                  const daysRemaining = getDaysUntilDeletion(poll.closedAt)
                  return (
                    <tr key={poll.id} className="border-b last:border-0">
                      <td className="max-w-[260px] px-3 py-2">
                        <div className="truncate font-medium" title={poll.title}>{poll.title}</div>
                        <div className="text-xs text-muted-foreground">{new Date(poll.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="max-w-[220px] px-3 py-2 text-muted-foreground">
                        <div className="truncate" title={poll.creatorName || poll.creatorEmail || 'Unknown owner'}>
                          {poll.creatorName || poll.creatorEmail || 'Unknown owner'}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            'rounded-full border px-2 py-1 text-xs',
                            poll.status === 'active' && 'border-green-200 bg-green-50 text-green-700',
                            poll.status === 'closed' && 'border-slate-200 bg-slate-50 text-slate-700',
                            poll.status === 'draft' && 'border-amber-200 bg-amber-50 text-amber-700'
                          )}
                        >
                          {poll.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{poll.slotsCount}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{poll.participantsCount}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{poll.votesCount}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {poll.status !== 'closed' || !poll.closedAt ? (
                          'Not scheduled'
                        ) : daysRemaining === null ? (
                          'Not scheduled'
                        ) : daysRemaining <= 0 ? (
                          <span className="font-medium text-red-600">Deletion pending</span>
                        ) : (
                          <div>
                            <div className={daysRemaining <= 7 ? 'font-medium text-amber-600' : ''}>
                              {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
                            </div>
                            {poll.autoClosedAt && <div className="text-amber-700">Auto-closed</div>}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-2">
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
                              {poll.status === 'closed' ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                            </Button>
                          )}
                          <Link
                            href={`/polls/${poll.uniqueLink}`}
                            className={cn(
                              buttonVariants({ variant: 'outline', size: 'sm' }),
                              'border-green-300 bg-green-600 text-white hover:bg-green-700'
                            )}
                          >
                            <ExternalLink className="h-4 w-4" />
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
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={pollPage}
            pageSize={pageSize}
            total={sortedPolls.length}
            onPageChange={setPollPage}
            onPageSizeChange={setSharedPageSize}
          />
        </CardContent>
      </Card>
    </div>
  )
}
