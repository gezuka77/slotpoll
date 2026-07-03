import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { participants, votes, polls, users } from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { checkRateLimit, isValidEmail } from '@/lib/security'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { addDeletedEntityCounts } from '@/lib/lifetime-stats'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pollId: string }> }
) {
  try {
    const { pollId } = await params
    const body = await request.json()
    const { name, email, votes: voteData } = body

    if (!name || !voteData) {
      return NextResponse.json(
        { error: 'Name and votes are required' },
        { status: 400 }
      )
    }

    if (email === undefined || email === null || email === '') {
      return NextResponse.json(
        { error: 'Email is required to submit or update a vote' },
        { status: 400 }
      )
    }
    const normalizedEmail = String(email).trim().toLowerCase()
    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const suspendedUser = await db.query.users.findFirst({
      where: sql`lower(${users.email}) = ${normalizedEmail}`,
    })
    if (suspendedUser?.suspended) {
      return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
    }

    const poll = await db.query.polls.findFirst({
      where: eq(polls.id, pollId),
      with: {
        slots: true,
      },
    })

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
    }
    if (poll.status === 'closed') {
      return NextResponse.json({ error: 'Poll is closed' }, { status: 403 })
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'
    const rate = checkRateLimit(`vote:${pollId}:${ip}`, 30, 10 * 60 * 1000)
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const slotIds = poll.slots.map((slot) => slot.id)
    const allowedVotes = poll.allowMaybe ? ['yes', 'no', 'maybe'] : ['yes', 'no']

    for (const slotId of slotIds) {
      const voteType = voteData[slotId]
      if (!voteType || !allowedVotes.includes(voteType)) {
        return NextResponse.json(
          { error: 'Please vote on all slots' },
          { status: 400 }
        )
      }
    }

    // Find existing participant by name (+ email if provided)
    const conditions = [
      eq(participants.pollId, pollId),
      sql`lower(${participants.email}) = ${normalizedEmail}`,
    ]

    const existingParticipant = await db.query.participants.findFirst({
      where: and(...conditions),
    })

    let participant = existingParticipant
    const session = await getServerSession(authOptions)
    const sessionEmail = session?.user?.email?.toLowerCase()

    if (participant) {
      if (!sessionEmail || sessionEmail !== normalizedEmail) {
        return NextResponse.json({ error: 'Sign in to edit your vote' }, { status: 403 })
      }
      // Replace previous votes
      if (participant.name !== name) {
        await db.update(participants).set({ name }).where(eq(participants.id, participant.id))
      }
      if (participant.email !== normalizedEmail) {
        await db.update(participants).set({ email: normalizedEmail }).where(eq(participants.id, participant.id))
      }
      await db.delete(votes).where(eq(votes.participantId, participant.id))
    } else {
      const [created] = await db
        .insert(participants)
        .values({
          pollId,
          name,
          email: normalizedEmail,
        })
        .returning()
      participant = created
    }

    // Create votes
    const voteValues = Object.entries(voteData)
      .filter(([_, voteType]) => voteType !== null)
      .map(([slotId, voteType]) => ({
        slotId,
        participantId: participant.id,
        voteType: voteType as 'yes' | 'no' | 'maybe',
      }))

    if (voteValues.length > 0) {
      await db.insert(votes).values(voteValues)
    }

    return NextResponse.json({
      success: true,
      updated: !!existingParticipant,
      participant: { name, email: normalizedEmail },
      votes: voteValues,
    })
  } catch (error) {
    console.error('Error submitting votes:', error)
    return NextResponse.json(
      { error: 'Failed to submit votes' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ pollId: string }> }
) {
  try {
    const { pollId } = await params
    const body = await request.json()
    const { name, email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    const normalizedEmail = String(email).trim().toLowerCase()
    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    const sessionEmail = session?.user?.email?.toLowerCase()
    if (!sessionEmail || sessionEmail !== normalizedEmail) {
      return NextResponse.json({ error: 'Sign in to delete your vote' }, { status: 403 })
    }

    const conditions = [
      eq(participants.pollId, pollId),
      sql`lower(${participants.email}) = ${normalizedEmail}`,
    ]

    const poll = await db.query.polls.findFirst({
      where: eq(polls.id, pollId),
    })
    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
    }
    if (poll.status === 'closed') {
      return NextResponse.json({ error: 'Poll is closed' }, { status: 403 })
    }

    const participant = await db.query.participants.findFirst({
      where: and(...conditions),
    })

    if (!participant) {
      return NextResponse.json({ error: 'Vote not found' }, { status: 404 })
    }

    const [voteCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(votes)
      .where(eq(votes.participantId, participant.id))

    await addDeletedEntityCounts({
      deletedParticipants: 1,
      deletedVotes: Number(voteCount?.count || 0),
    })
    await db.delete(votes).where(eq(votes.participantId, participant.id))
    await db.delete(participants).where(eq(participants.id, participant.id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting votes:', error)
    return NextResponse.json(
      { error: 'Failed to delete votes' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pollId: string }> }
) {
  try {
    const { pollId } = await params
    const email = request.nextUrl.searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    const normalizedEmail = String(email).trim().toLowerCase()
    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const participant = await db.query.participants.findFirst({
      where: and(
        eq(participants.pollId, pollId),
        sql`lower(${participants.email}) = ${normalizedEmail}`
      ),
      with: {
        votes: true,
      },
    })

    if (!participant) {
      return NextResponse.json({ found: false })
    }

    const voteMap: Record<string, string> = {}
    participant.votes.forEach((vote) => {
      voteMap[vote.slotId] = vote.voteType
    })

    return NextResponse.json({
      found: true,
      participant: { name: participant.name, email: participant.email },
      votes: voteMap,
    })
  } catch (error) {
    console.error('Error fetching votes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch votes' },
      { status: 500 }
    )
  }
}
