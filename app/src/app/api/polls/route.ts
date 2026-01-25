import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/db'
import { polls, slots, users } from '@/db/schema'
import { generateUniqueLink } from '@/lib/utils'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    })
    if (dbUser?.suspended) {
      return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, location, slots: timeSlots } = body

    if (!title || !timeSlots || timeSlots.length === 0) {
      return NextResponse.json(
        { error: 'Title and at least one time slot are required' },
        { status: 400 }
      )
    }

    // Create poll
    const [poll] = await db
      .insert(polls)
      .values({
        title,
        description,
        location,
        creatorId: session.user.id,
        uniqueLink: generateUniqueLink(),
        status: 'active',
      })
      .returning()

    // Create slots
    const slotValues = []
    for (const slot of timeSlots) {
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

      slotValues.push({
        pollId: poll.id,
        startTime,
        endTime,
      })
    }

    await db.insert(slots).values(slotValues)

    return NextResponse.json(poll)
  } catch (error) {
    console.error('Error creating poll:', error)
    return NextResponse.json(
      { error: 'Failed to create poll' },
      { status: 500 }
    )
  }
}
