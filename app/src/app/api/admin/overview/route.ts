import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/db'
import { polls, users, slots, participants, votes } from '@/db/schema'
import { desc, eq, sql } from 'drizzle-orm'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'super_user') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const [usersCount] = await db.select({ count: sql<number>`count(*)` }).from(users)
    const [pollsCount] = await db.select({ count: sql<number>`count(*)` }).from(polls)
    const [slotsCount] = await db.select({ count: sql<number>`count(*)` }).from(slots)
    const [participantsCount] = await db.select({ count: sql<number>`count(*)` }).from(participants)
    const [votesCount] = await db.select({ count: sql<number>`count(*)` }).from(votes)

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
    let demoParticipants: { email: string; name: string | null; pollsVoted: number; lastSeen: Date }[] = []
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
          lastSeen: entry.lastSeen,
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

    const payload = {
      users: usersWithCounts,
      nonUsers: nonUserParticipants,
      demoParticipants,
      polls: pollsForAdmin,
      stats: {
        users: Number(usersCount?.count ?? 0),
        polls: Number(pollsCount?.count ?? 0),
        slots: Number(slotsCount?.count ?? 0),
        participants: Number(participantsCount?.count ?? 0),
        votes: Number(votesCount?.count ?? 0),
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
