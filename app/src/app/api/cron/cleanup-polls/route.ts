import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { polls, slots } from '@/db/schema'
import { and, eq, lt, isNotNull, sql } from 'drizzle-orm'
import { recordPollRowsForDeletion } from '@/lib/lifetime-stats'

const AUTO_CLOSE_GRACE_HOURS = 24

type AutoClosedPoll = {
  id: string
  title: string
  uniqueLink: string
  closedAt: Date | string
  lastSlotAt: Date | string
}

type StaleActivePoll = {
  id: string
  title: string
  uniqueLink: string
  lastSlotAt: Date | string
}

function rowsFromResult<T>(result: unknown): T[] {
  if (result && typeof result === 'object' && 'rows' in result) {
    return (result as { rows: T[] }).rows
  }
  return result as T[]
}

/**
 * GDPR Compliance: Cleanup API for closing stale active polls and deleting closed polls after 30 days
 *
 * This endpoint should be called by a cron job (e.g., daily).
 * It first auto-closes active polls whose latest slot ended more than 24 hours ago.
 * Then it deletes polls that have been closed for more than 30 days.
 *
 * Authentication: Requires DEMO_CLEANUP_TOKEN in Authorization header
 *
 * Usage with cron:
 * - Vercel Cron: Add to vercel.json
 * - External cron: curl with Authorization header
 *
 * Example:
 * curl -X POST https://slotpoll.yourdomain.com/api/cron/cleanup-polls \
 *   -H "Authorization: Bearer YOUR_TOKEN"
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authorization token
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    const expectedToken = process.env.DEMO_CLEANUP_TOKEN

    if (!expectedToken) {
      console.error('DEMO_CLEANUP_TOKEN not configured')
      return NextResponse.json(
        { error: 'Cleanup token not configured' },
        { status: 500 }
      )
    }

    if (token !== expectedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const now = new Date()

    // Auto-close active polls after every proposed slot has passed, with a 24-hour grace period.
    const autoCloseCutoff = new Date(now)
    autoCloseCutoff.setHours(autoCloseCutoff.getHours() - AUTO_CLOSE_GRACE_HOURS)
    const nowIso = now.toISOString()
    const autoCloseCutoffIso = autoCloseCutoff.toISOString()

    const autoClosedResult = await db.execute(sql`
      with stale_polls as (
        select
          ${polls.id} as id,
          max(coalesce(${slots.endTime}, ${slots.startTime})) as "lastSlotAt"
        from ${polls}
        join ${slots} on ${slots.pollId} = ${polls.id}
        where ${polls.status} = 'active'
          and ${polls.uniqueLink} <> 'demo'
        group by ${polls.id}
        having max(coalesce(${slots.endTime}, ${slots.startTime})) < ${autoCloseCutoffIso}::timestamp
      )
      update ${polls}
      set
        status = 'closed',
        "closedAt" = ${nowIso}::timestamp,
        "autoClosedAt" = ${nowIso}::timestamp,
        "updatedAt" = ${nowIso}::timestamp
      from stale_polls
      where ${polls.id} = stale_polls.id
      returning
        ${polls.id} as id,
        ${polls.title} as title,
        ${polls.uniqueLink} as "uniqueLink",
        ${polls.closedAt} as "closedAt",
        stale_polls."lastSlotAt" as "lastSlotAt"
    `)
    const autoClosedPolls = rowsFromResult<AutoClosedPoll>(autoClosedResult) || []

    if (autoClosedPolls.length > 0) {
      console.log(
        `Auto-closed ${autoClosedPolls.length} stale active polls:`,
        autoClosedPolls.map((p) => p.uniqueLink)
      )
    }

    // Calculate the deletion cutoff date (30 days ago)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    console.log(`Starting GDPR cleanup: deleting polls closed before ${thirtyDaysAgo.toISOString()}`)

    // Find polls to delete
    const pollsToDelete = await db.query.polls.findMany({
      where: and(
        eq(polls.status, 'closed'),
        isNotNull(polls.closedAt),
        lt(polls.closedAt, thirtyDaysAgo)
      ),
      columns: {
        id: true,
        title: true,
        closedAt: true,
        uniqueLink: true,
      },
    })

    if (pollsToDelete.length === 0) {
      console.log('No polls to clean up')
      return NextResponse.json({
        success: true,
        message: autoClosedPolls.length > 0
          ? `Auto-closed ${autoClosedPolls.length} stale active polls; no polls found for deletion`
          : 'No polls found for cleanup',
        autoClosed: autoClosedPolls.length,
        autoClosedPolls: autoClosedPolls.map((p) => ({
          uniqueLink: p.uniqueLink,
          title: p.title,
          lastSlotAt: p.lastSlotAt,
          closedAt: p.closedAt,
        })),
        deleted: 0,
      })
    }

    console.log(`Found ${pollsToDelete.length} polls to delete:`, pollsToDelete.map(p => p.uniqueLink))

    // Delete the polls (cascade will handle related data)
    const pollIds = pollsToDelete.map(p => p.id)
    await recordPollRowsForDeletion(pollIds)
    for (const pollId of pollIds) {
      await db.delete(polls).where(eq(polls.id, pollId))
    }

    console.log(`Successfully deleted ${pollsToDelete.length} polls`)

    return NextResponse.json({
      success: true,
      message: `Auto-closed ${autoClosedPolls.length} stale active polls; deleted ${pollsToDelete.length} polls older than 30 days`,
      autoClosed: autoClosedPolls.length,
      autoClosedPolls: autoClosedPolls.map((p) => ({
        uniqueLink: p.uniqueLink,
        title: p.title,
        lastSlotAt: p.lastSlotAt,
        closedAt: p.closedAt,
      })),
      deleted: pollsToDelete.length,
      polls: pollsToDelete.map(p => ({
        uniqueLink: p.uniqueLink,
        title: p.title,
        closedAt: p.closedAt,
      })),
    })
  } catch (error) {
    console.error('Error during poll cleanup:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup polls', details: String(error) },
      { status: 500 }
    )
  }
}

// Support GET for testing (requires token)
export async function GET(request: NextRequest) {
  try {
    // Verify authorization token
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    const expectedToken = process.env.DEMO_CLEANUP_TOKEN

    if (!expectedToken || token !== expectedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const now = new Date()

    const autoCloseCutoff = new Date(now)
    autoCloseCutoff.setHours(autoCloseCutoff.getHours() - AUTO_CLOSE_GRACE_HOURS)
    const autoCloseCutoffIso = autoCloseCutoff.toISOString()

    const staleActiveResult = await db.execute(sql`
      select
        ${polls.id} as id,
        ${polls.title} as title,
        ${polls.uniqueLink} as "uniqueLink",
        max(coalesce(${slots.endTime}, ${slots.startTime})) as "lastSlotAt"
      from ${polls}
      join ${slots} on ${slots.pollId} = ${polls.id}
      where ${polls.status} = 'active'
        and ${polls.uniqueLink} <> 'demo'
      group by ${polls.id}
      having max(coalesce(${slots.endTime}, ${slots.startTime})) < ${autoCloseCutoffIso}::timestamp
      order by "lastSlotAt" asc
    `)
    const staleActivePolls = rowsFromResult<StaleActivePoll>(staleActiveResult) || []

    // Calculate the deletion cutoff date (30 days ago)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Find polls that would be deleted (dry run)
    const pollsToDelete = await db.query.polls.findMany({
      where: and(
        eq(polls.status, 'closed'),
        isNotNull(polls.closedAt),
        lt(polls.closedAt, thirtyDaysAgo)
      ),
      columns: {
        id: true,
        title: true,
        closedAt: true,
        uniqueLink: true,
      },
    })

    return NextResponse.json({
      dryRun: true,
      autoCloseCutoffDate: autoCloseCutoff.toISOString(),
      autoCloseGraceHours: AUTO_CLOSE_GRACE_HOURS,
      autoCloseCount: staleActivePolls.length,
      autoClosePolls: staleActivePolls.map((p) => ({
        uniqueLink: p.uniqueLink,
        title: p.title,
        lastSlotAt: p.lastSlotAt,
      })),
      cutoffDate: thirtyDaysAgo.toISOString(),
      count: pollsToDelete.length,
      polls: pollsToDelete.map(p => ({
        uniqueLink: p.uniqueLink,
        title: p.title,
        closedAt: p.closedAt,
      })),
    })
  } catch (error) {
    console.error('Error checking polls for cleanup:', error)
    return NextResponse.json(
      { error: 'Failed to check polls', details: String(error) },
      { status: 500 }
    )
  }
}
