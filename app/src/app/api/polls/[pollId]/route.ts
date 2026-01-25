import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/db'
import { polls, slots } from '@/db/schema'
import { eq, inArray } from 'drizzle-orm'

type SlotInput = {
  id?: string
  date?: string
  startTime?: string
  endTime?: string | null
  startTimeIso?: string
  endTimeIso?: string | null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ pollId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { pollId } = await params
    const body = await request.json()
    const { status, slots: slotInputs, title, description, location } = body as {
      status?: 'active' | 'closed'
      slots?: SlotInput[]
      title?: string
      description?: string | null
      location?: string | null
    }

    const poll = await db.query.polls.findFirst({
      where: eq(polls.id, pollId),
    })

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
    }

    if (poll.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updates: { status?: 'active' | 'closed'; title?: string; description?: string | null; location?: string | null } =
      {}

    if (status && (status === 'active' || status === 'closed')) {
      updates.status = status
    }
    if (typeof title === 'string') {
      const trimmed = title.trim()
      if (!trimmed) {
        return NextResponse.json({ error: 'Title is required' }, { status: 400 })
      }
      updates.title = trimmed
    }
    if (typeof description === 'string' || description === null) {
      updates.description = description ? description.trim() : null
    }
    if (typeof location === 'string' || location === null) {
      updates.location = location ? location.trim() : null
    }

    if (Object.keys(updates).length > 0) {
      await db.update(polls).set(updates).where(eq(polls.id, pollId))
    }

    if (Array.isArray(slotInputs)) {
      if (slotInputs.length === 0) {
        return NextResponse.json(
          { error: 'At least one slot is required' },
          { status: 400 }
        )
      }

      for (const slot of slotInputs) {
        if (!slot.startTimeIso && (!slot.date || !slot.startTime)) {
          return NextResponse.json(
            { error: 'Each slot must include a date and start time' },
            { status: 400 }
          )
        }
      }

      const existingSlots = await db.query.slots.findMany({
        where: eq(slots.pollId, pollId),
        with: {
          votes: true,
        },
      })
      const existingById = new Map(existingSlots.map((slot) => [slot.id, slot]))
      const incomingIds = new Set(slotInputs.map((slot) => slot.id).filter(Boolean) as string[])

      for (const slot of slotInputs) {
        let startTime: Date | null = null
        let endTime: Date | null = null

        if (slot.startTimeIso) {
          startTime = new Date(slot.startTimeIso)
          endTime = slot.endTimeIso ? new Date(slot.endTimeIso) : null
        } else if (slot.date && slot.startTime) {
          startTime = new Date(`${slot.date}T${slot.startTime}`)
          endTime = slot.endTime ? new Date(`${slot.date}T${slot.endTime}`) : null
        }

        if (!startTime || Number.isNaN(startTime.getTime())) {
          return NextResponse.json(
            { error: 'Invalid slot start time' },
            { status: 400 }
          )
        }

        if (slot.id && existingById.has(slot.id)) {
          const existing = existingById.get(slot.id)
          const hasVotes = (existing?.votes?.length || 0) > 0
          if (hasVotes) {
            const existingStart = existing?.startTime?.toISOString()
            const existingEnd = existing?.endTime?.toISOString()
            const nextStart = startTime.toISOString()
            const nextEnd = endTime ? endTime.toISOString() : null
            if (existingStart !== nextStart || existingEnd !== nextEnd) {
              return NextResponse.json(
                { error: 'Cannot edit a slot that already has votes' },
                { status: 400 }
              )
            }
            continue
          }
        }

        if (startTime.getMinutes() % 30 !== 0) {
          return NextResponse.json(
            { error: 'Start time must be in 30 minute increments' },
            { status: 400 }
          )
        }

        if (endTime) {
          if (Number.isNaN(endTime.getTime())) {
            return NextResponse.json(
              { error: 'Invalid slot end time' },
              { status: 400 }
            )
          }
          if (endTime.getTime() <= startTime.getTime()) {
            return NextResponse.json(
              { error: 'End time must be after start time' },
              { status: 400 }
            )
          }
          if (endTime.getMinutes() % 30 !== 0) {
            return NextResponse.json(
              { error: 'End time must be in 30 minute increments' },
              { status: 400 }
            )
          }
        }
      }

      // Delete removed slots
      const toDelete = existingSlots
        .map((slot) => slot.id)
        .filter((id) => !incomingIds.has(id))
      if (toDelete.some((id) => (existingById.get(id)?.votes?.length || 0) > 0)) {
        return NextResponse.json(
          { error: 'Cannot remove a slot that already has votes' },
          { status: 400 }
        )
      }
      if (toDelete.length > 0) {
        await db.delete(slots).where(inArray(slots.id, toDelete))
      }

      // Update existing and insert new slots
      for (const slot of slotInputs) {
        let startTime: Date | null = null
        let endTime: Date | null = null

        if (slot.startTimeIso) {
          startTime = new Date(slot.startTimeIso)
          endTime = slot.endTimeIso ? new Date(slot.endTimeIso) : null
        } else if (slot.date && slot.startTime) {
          startTime = new Date(`${slot.date}T${slot.startTime}`)
          endTime = slot.endTime ? new Date(`${slot.date}T${slot.endTime}`) : null
        }

        if (!startTime || Number.isNaN(startTime.getTime())) {
          continue
        }

        if (slot.id && existingById.has(slot.id)) {
          const existing = existingById.get(slot.id)
          if (existing && existing.votes && existing.votes.length > 0) {
            const existingStart = existing.startTime?.toISOString()
            const existingEnd = existing.endTime?.toISOString()
            const nextStart = startTime.toISOString()
            const nextEnd = endTime ? endTime.toISOString() : null
            if (existingStart !== nextStart || existingEnd !== nextEnd) {
              return NextResponse.json(
                { error: 'Cannot edit a slot that already has votes' },
                { status: 400 }
              )
            }
          }

          await db
            .update(slots)
            .set({ startTime, endTime })
            .where(eq(slots.id, slot.id))
        } else {
          await db.insert(slots).values({
            pollId,
            startTime,
            endTime,
          })
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating poll:', error)
    return NextResponse.json(
      { error: 'Failed to update poll' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ pollId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { pollId } = await params
    const poll = await db.query.polls.findFirst({
      where: eq(polls.id, pollId),
    })

    if (!poll) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
    }

    if (poll.creatorId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await db.delete(polls).where(eq(polls.id, pollId))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting poll:', error)
    return NextResponse.json(
      { error: 'Failed to delete poll' },
      { status: 500 }
    )
  }
}
