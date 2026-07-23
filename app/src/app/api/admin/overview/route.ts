import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/db'
import { polls, users, slots, participants, votes } from '@/db/schema'
import { and, desc, eq, isNotNull, sql } from 'drizzle-orm'
import { getDeletedEntityCounts } from '@/lib/lifetime-stats'

type TrendPoint = {
  label: string
  value: number
}

type TrendRange = 'daily' | 'weekly' | 'monthly'

const trendRanges: Record<TrendRange, { unit: 'day' | 'week' | 'month'; points: number }> = {
  daily: { unit: 'day', points: 14 },
  weekly: { unit: 'week', points: 12 },
  monthly: { unit: 'month', points: 12 },
}

function getTrendStart(range: TrendRange) {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const { unit, points } = trendRanges[range]

  if (unit === 'week') {
    const mondayOffset = (start.getUTCDay() + 6) % 7
    start.setUTCDate(start.getUTCDate() - mondayOffset)
    start.setUTCDate(start.getUTCDate() - (points - 1) * 7)
    return start
  }

  if (unit === 'month') {
    start.setUTCDate(1)
    start.setUTCMonth(start.getUTCMonth() - (points - 1))
    return start
  }

  start.setUTCDate(start.getUTCDate() - (points - 1))
  return start
}

function addTrendUnit(date: Date, range: TrendRange, amount: number) {
  const next = new Date(date)
  const unit = trendRanges[range].unit
  if (unit === 'month') next.setUTCMonth(next.getUTCMonth() + amount)
  if (unit === 'week') next.setUTCDate(next.getUTCDate() + amount * 7)
  if (unit === 'day') next.setUTCDate(next.getUTCDate() + amount)
  return next
}

function getTrendKey(date: Date, range: TrendRange) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  if (range === 'monthly') return `${year}-${month}`
  return `${year}-${month}-${day}`
}

function getTrendLabel(date: Date, range: TrendRange) {
  if (range === 'monthly') {
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' })
  }
  if (range === 'weekly') {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  }
  return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', timeZone: 'UTC' })
}

async function getCreatedTrend(tableName: '"user"' | 'polls' | 'slots' | 'participants' | 'votes') {
  const result: Record<TrendRange, TrendPoint[]> = {
    daily: [],
    weekly: [],
    monthly: [],
  }

  for (const range of Object.keys(trendRanges) as TrendRange[]) {
    const { unit, points } = trendRanges[range]
    const start = getTrendStart(range)
    const rowsRaw = await db.execute(sql`
      select date_trunc(${unit}, "createdAt")::date::text as bucket, count(*)::int as count
      from ${sql.raw(tableName)}
      where "createdAt" >= ${start.toISOString()}::timestamp
      group by bucket
      order by bucket
    `)
    const rows: Array<{ bucket: string; count: number }> =
      'rows' in (rowsRaw as any) ? (rowsRaw as any).rows : (rowsRaw as any)
    const counts = new Map<string, number>()
    for (const row of rows || []) {
      const key = range === 'monthly' ? String(row.bucket).slice(0, 7) : String(row.bucket).slice(0, 10)
      counts.set(key, Number(row.count || 0))
    }

    result[range] = Array.from({ length: points }, (_, index) => {
      const date = addTrendUnit(start, range, index)
      const key = getTrendKey(date, range)
      return {
        label: getTrendLabel(date, range),
        value: counts.get(key) || 0,
      }
    })
  }

  return result
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'super_user') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const deletedStats = await getDeletedEntityCounts()
    const onlineSince = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)
    const weekStart = new Date(todayStart)
    weekStart.setUTCDate(todayStart.getUTCDate() - todayStart.getUTCDay())
    const monthStart = new Date(Date.UTC(todayStart.getUTCFullYear(), todayStart.getUTCMonth(), 1))
    const todayStartIso = todayStart.toISOString()
    const weekStartIso = weekStart.toISOString()
    const monthStartIso = monthStart.toISOString()
    const [usersCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users)
    const [activeUsersCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.suspended, false))
    const [onlineUsersCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(and(eq(users.suspended, false), sql`${users.lastSeenAt} >= ${onlineSince}::timestamp`))
    const [usersSeenTodayCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(and(eq(users.suspended, false), sql`${users.lastSeenAt} >= ${todayStartIso}::timestamp`))
    const [usersSeenThisWeekCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(and(eq(users.suspended, false), sql`${users.lastSeenAt} >= ${weekStartIso}::timestamp`))
    const [usersSeenThisMonthCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(and(eq(users.suspended, false), sql`${users.lastSeenAt} >= ${monthStartIso}::timestamp`))
    const [pollsCount] = await db.select({ count: sql<number>`count(*)::int` }).from(polls)
    const [activePollsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(polls)
      .where(eq(polls.status, 'active'))
    const [scheduledPollsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(polls)
      .where(and(eq(polls.status, 'closed'), isNotNull(polls.closedAt)))
    const [slotsCount] = await db.select({ count: sql<number>`count(*)::int` }).from(slots)
    const [activeSlotsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(slots)
      .innerJoin(polls, eq(slots.pollId, polls.id))
      .where(eq(polls.status, 'active'))
    const [scheduledSlotsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(slots)
      .innerJoin(polls, eq(slots.pollId, polls.id))
      .where(and(eq(polls.status, 'closed'), isNotNull(polls.closedAt)))
    const [participantsCount] = await db.select({ count: sql<number>`count(*)::int` }).from(participants)
    const [activeParticipantsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(participants)
      .innerJoin(polls, eq(participants.pollId, polls.id))
      .where(eq(polls.status, 'active'))
    const [scheduledParticipantsCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(participants)
      .innerJoin(polls, eq(participants.pollId, polls.id))
      .where(and(eq(polls.status, 'closed'), isNotNull(polls.closedAt)))
    const [votesCount] = await db.select({ count: sql<number>`count(*)::int` }).from(votes)
    const [activeVotesCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(votes)
      .innerJoin(slots, eq(votes.slotId, slots.id))
      .innerJoin(polls, eq(slots.pollId, polls.id))
      .where(eq(polls.status, 'active'))
    const [scheduledVotesCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(votes)
      .innerJoin(slots, eq(votes.slotId, slots.id))
      .innerJoin(polls, eq(slots.pollId, polls.id))
      .where(and(eq(polls.status, 'closed'), isNotNull(polls.closedAt)))

    const userRows = await db.query.users.findMany({
      orderBy: [desc(users.createdAt)],
    })

    const pollRows = await db.query.polls.findMany({
      orderBy: [desc(polls.createdAt)],
      with: {
        creator: true,
        slots: true,
        participants: true,
      },
    })

    const pollVoteRows = await db.execute(sql`
      select s."pollId" as "pollId", count(v.id) as "votesCount"
      from ${slots} s
      left join ${votes} v on v."slotId" = s.id
      group by s."pollId"
    `)
    const voteRows: Array<{ pollId: string; votesCount: number }> =
      'rows' in (pollVoteRows as any)
        ? ((pollVoteRows as any).rows as Array<{ pollId: string; votesCount: number }>)
        : (pollVoteRows as any)
    const pollVotesMap = new Map<string, number>()
    for (const row of voteRows || []) {
      pollVotesMap.set(String(row.pollId), Number(row.votesCount || 0))
    }

    const usersWithCounts = await Promise.all(
      userRows.map(async (user) => {
        const [pollsCreated] = await db
          .select({ count: sql<number>`count(*)` })
          .from(polls)
          .where(eq(polls.creatorId, user.id))

        let votesCountValue = 0
        if (user.email) {
          const participantRows = await db.query.participants.findMany({
            where: sql`lower(${participants.email}) = ${user.email.toLowerCase()}`,
            columns: {
              pollId: true,
            },
          })
          const uniquePolls = new Set(participantRows.map((row) => row.pollId))
          votesCountValue = uniquePolls.size
        }

        let displayName = user.name
        if (!displayName && user.email) {
          const fallback = await db.query.participants.findFirst({
            where: sql`lower(${participants.email}) = ${user.email.toLowerCase()}`,
            orderBy: [desc(participants.createdAt)],
          })
          displayName = fallback?.name || null
        }

        return {
          id: user.id,
          name: displayName,
          email: user.email,
          role: user.role,
          suspended: user.suspended,
          lastSeenAt: user.lastSeenAt ? user.lastSeenAt.toISOString() : null,
          createdAt: user.createdAt.toISOString(),
          pollsCount: Number(pollsCreated?.count ?? 0),
          votesCount: votesCountValue,
        }
      })
    )

    const userEmails = new Set(
      userRows
        .map((user) => user.email?.toLowerCase())
        .filter((email): email is string => Boolean(email))
    )

    const participantRows = await db.query.participants.findMany({
      where: sql`${participants.email} is not null`,
      columns: {
        email: true,
        name: true,
        pollId: true,
        createdAt: true,
      },
    })

    const participantMap = new Map<
      string,
      { email: string; name: string | null; lastSeen: Date; pollIds: Set<string> }
    >()

    for (const row of participantRows) {
      const email = row.email?.toLowerCase()
      if (!email || userEmails.has(email)) continue
      const existing = participantMap.get(email)
      if (!existing) {
        participantMap.set(email, {
          email: row.email!,
          name: row.name || null,
          lastSeen: row.createdAt,
          pollIds: new Set([row.pollId]),
        })
        continue
      }
      existing.pollIds.add(row.pollId)
      if (row.createdAt > existing.lastSeen) {
        existing.lastSeen = row.createdAt
        existing.name = row.name || existing.name
      }
    }

    const demoPoll = await db.query.polls.findFirst({
      where: eq(polls.uniqueLink, 'demo'),
    })
    let demoParticipants: { email: string; name: string | null; pollsVoted: number; lastSeenAt: string }[] = []
    if (demoPoll) {
      const demoRows = await db.query.participants.findMany({
        where: eq(participants.pollId, demoPoll.id),
        columns: {
          email: true,
          name: true,
          createdAt: true,
        },
      })
      const demoMap = new Map<string, { email: string; name: string | null; lastSeen: Date }>()
      for (const row of demoRows) {
        const email = row.email?.toLowerCase()
        if (!email) continue
        const existing = demoMap.get(email)
        if (!existing) {
          demoMap.set(email, {
            email: row.email!,
            name: row.name || null,
            lastSeen: row.createdAt,
          })
          continue
        }
        if (row.createdAt > existing.lastSeen) {
          existing.lastSeen = row.createdAt
          existing.name = row.name || existing.name
        }
      }
      demoParticipants = Array.from(demoMap.values())
        .sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime())
        .map((entry) => ({
          email: entry.email,
          name: entry.name,
          pollsVoted: 1,
          lastSeenAt: entry.lastSeen.toISOString(),
        }))
    }
    const demoEmails = new Set(demoParticipants.map((entry) => entry.email.toLowerCase()))

    const nonUserParticipants = Array.from(participantMap.values())
      .filter((entry) => !demoEmails.has(entry.email.toLowerCase()))
      .sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime())
      .slice(0, 200)
      .map((entry) => ({
        email: entry.email,
        name: entry.name,
        pollsVoted: entry.pollIds.size,
        lastSeenAt: entry.lastSeen.toISOString(),
      }))

    const pollsForAdmin = pollRows.map((poll) => ({
      id: poll.id,
      title: poll.title,
      uniqueLink: poll.uniqueLink,
      status: poll.status,
      creatorName: poll.creator?.name || null,
      creatorEmail: poll.creator?.email || null,
      slotsCount: poll.slots.length,
      participantsCount: poll.participants.length,
      votesCount: pollVotesMap.get(poll.id) || 0,
      closedAt: poll.closedAt ? poll.closedAt.toISOString() : null,
      autoClosedAt: poll.autoClosedAt ? poll.autoClosedAt.toISOString() : null,
      createdAt: poll.createdAt.toISOString(),
    }))

    const topSlotsRaw = await db.execute(sql`
      select
        s.id as "slotId",
        s."startTime"::text as "startTime",
        s."endTime"::text as "endTime",
        p.title as "pollTitle",
        p."uniqueLink" as "uniqueLink",
        sum(case when v."voteType" = 'yes' then 1 else 0 end) as "yesVotes",
        count(v.id) as "totalVotes"
      from ${slots} s
      join ${polls} p on p.id = s."pollId"
      left join ${votes} v on v."slotId" = s.id
      group by s.id, p.id
      order by "yesVotes" desc, "totalVotes" desc
      limit 10
    `)

    const topSlotRows: any[] =
      'rows' in (topSlotsRaw as any) ? (topSlotsRaw as any).rows : (topSlotsRaw as any)
    const topSlots = (topSlotRows || []).map((row: any) => ({
      slotId: row.slotId,
      pollTitle: row.pollTitle,
      pollLink: `/polls/${row.uniqueLink}`,
      startTime: row.startTime ? String(row.startTime) : null,
      endTime: row.endTime ? String(row.endTime) : null,
      yesVotes: Number(row.yesVotes || 0),
      totalVotes: Number(row.totalVotes || 0),
    }))

    const today = new Date()
    const start = new Date(today)
    start.setDate(start.getDate() - 29)
    start.setHours(0, 0, 0, 0)

    const startIso = start.toISOString()
    const pollsRecent = await db.execute(sql`
      select to_char(${polls.createdAt}, 'YYYY-MM-DD') as day, count(*) as count
      from ${polls}
      where ${polls.createdAt} >= ${startIso}
      group by day
    `)

    const votesRecent = await db.execute(sql`
      select to_char(${votes.createdAt}, 'YYYY-MM-DD') as day, count(*) as count
      from ${votes}
      where ${votes.createdAt} >= ${startIso}
      group by day
    `)

    const pollCounts = new Map<string, number>()
    const recentPollRows: any[] =
      'rows' in (pollsRecent as any) ? (pollsRecent as any).rows : (pollsRecent as any)
    for (const row of recentPollRows || []) {
      pollCounts.set(String(row.day), Number(row.count || 0))
    }

    const voteCounts = new Map<string, number>()
    const recentVoteRows: any[] =
      'rows' in (votesRecent as any) ? (votesRecent as any).rows : (votesRecent as any)
    for (const row of recentVoteRows || []) {
      voteCounts.set(String(row.day), Number(row.count || 0))
    }

    const activity = Array.from({ length: 30 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      const key = date.toISOString().slice(0, 10)
      return {
        date: key,
        polls: pollCounts.get(key) || 0,
        votes: voteCounts.get(key) || 0,
      }
    })

    const [userTrend, pollTrend, slotTrend, participantTrend, voteTrend] = await Promise.all([
      getCreatedTrend('"user"'),
      getCreatedTrend('polls'),
      getCreatedTrend('slots'),
      getCreatedTrend('participants'),
      getCreatedTrend('votes'),
    ])

    const payload = {
      users: usersWithCounts,
      nonUsers: nonUserParticipants,
      demoParticipants,
      polls: pollsForAdmin,
      stats: {
        users: {
          lifetime: Number(usersCount?.count ?? 0) + deletedStats.deletedUsers,
          active: Number(activeUsersCount?.count ?? 0),
          online: Number(onlineUsersCount?.count ?? 0),
          seenToday: Number(usersSeenTodayCount?.count ?? 0),
          seenThisWeek: Number(usersSeenThisWeekCount?.count ?? 0),
          seenThisMonth: Number(usersSeenThisMonthCount?.count ?? 0),
          scheduledDeletion: 0,
          trend: userTrend,
        },
        polls: {
          lifetime: Number(pollsCount?.count ?? 0) + deletedStats.deletedPolls,
          active: Number(activePollsCount?.count ?? 0),
          scheduledDeletion: Number(scheduledPollsCount?.count ?? 0),
          trend: pollTrend,
        },
        slots: {
          lifetime: Number(slotsCount?.count ?? 0) + deletedStats.deletedSlots,
          active: Number(activeSlotsCount?.count ?? 0),
          scheduledDeletion: Number(scheduledSlotsCount?.count ?? 0),
          trend: slotTrend,
        },
        participants: {
          lifetime: Number(participantsCount?.count ?? 0) + deletedStats.deletedParticipants,
          active: Number(activeParticipantsCount?.count ?? 0),
          scheduledDeletion: Number(scheduledParticipantsCount?.count ?? 0),
          trend: participantTrend,
        },
        votes: {
          lifetime: Number(votesCount?.count ?? 0) + deletedStats.deletedVotes,
          active: Number(activeVotesCount?.count ?? 0),
          scheduledDeletion: Number(scheduledVotesCount?.count ?? 0),
          trend: voteTrend,
        },
      },
      topSlots,
      activity,
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Error loading admin overview:', error)
    return NextResponse.json({ error: 'Failed to load admin overview' }, { status: 500 })
  }
}
