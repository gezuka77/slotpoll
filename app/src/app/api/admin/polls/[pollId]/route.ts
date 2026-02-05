import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/db'
import { polls } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ pollId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'super_user') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { pollId } = await params
    const body = await request.json()
    const status = body?.status as 'active' | 'closed'

    if (!status || !['active', 'closed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Get current poll to check if status is changing
    const poll = await db.query.polls.findFirst({
      where: eq(polls.id, pollId),
    })

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
    }

    const updates: { status: 'active' | 'closed'; closedAt?: Date | null } = { status }

    // Set closedAt timestamp when closing a poll
    if (status === 'closed' && poll.status !== 'closed') {
      updates.closedAt = new Date()
    }
    // Clear closedAt when reopening a poll
    if (status === 'active' && poll.status === 'closed') {
      updates.closedAt = null
    }

    await db.update(polls).set(updates).where(eq(polls.id, pollId))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating poll status:', error)
    return NextResponse.json({ error: 'Failed to update poll status' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ pollId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'super_user') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { pollId } = await params
    await db.delete(polls).where(eq(polls.id, pollId))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting poll:', error)
    return NextResponse.json({ error: 'Failed to delete poll' }, { status: 500 })
  }
}
