import { NextResponse } from 'next/server'
import { db } from '@/db'
import { participants, polls, slots, votes } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'
import { addDeletedEntityCounts } from '@/lib/lifetime-stats'

export async function POST(request: Request) {
  const token = request.headers.get('x-demo-cleanup-token')
  if (!token || token !== process.env.DEMO_CLEANUP_TOKEN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const demoPoll = await db.query.polls.findFirst({
    where: eq(polls.uniqueLink, 'demo'),
  })

  if (!demoPoll) {
    return NextResponse.json({ ok: true, deletedParticipants: 0 })
  }

  const [participantCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(participants)
    .where(eq(participants.pollId, demoPoll.id))
  const [voteCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(votes)
    .innerJoin(slots, eq(votes.slotId, slots.id))
    .where(eq(slots.pollId, demoPoll.id))

  await addDeletedEntityCounts({
    deletedParticipants: Number(participantCount?.count || 0),
    deletedVotes: Number(voteCount?.count || 0),
  })
  await db.delete(participants).where(eq(participants.pollId, demoPoll.id))

  return NextResponse.json({ ok: true, deletedParticipants: 'all' })
}
