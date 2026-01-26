import { NextResponse } from 'next/server'
import { db } from '@/db'
import { participants, polls } from '@/db/schema'
import { eq } from 'drizzle-orm'

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

  await db.delete(participants).where(eq(participants.pollId, demoPoll.id))

  return NextResponse.json({ ok: true, deletedParticipants: 'all' })
}
