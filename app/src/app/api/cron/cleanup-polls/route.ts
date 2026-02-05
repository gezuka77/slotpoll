import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { polls } from '@/db/schema'
import { and, eq, lt, isNotNull } from 'drizzle-orm'

/**
 * GDPR Compliance: Cleanup API for deleting closed polls after 30 days
 *
 * This endpoint should be called by a cron job (e.g., daily).
 * It finds all polls that have been closed for more than 30 days and deletes them.
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

    // Calculate the cutoff date (30 days ago)
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
        message: 'No polls found for cleanup',
        deleted: 0,
      })
    }

    console.log(`Found ${pollsToDelete.length} polls to delete:`, pollsToDelete.map(p => p.uniqueLink))

    // Delete the polls (cascade will handle related data)
    const pollIds = pollsToDelete.map(p => p.id)
    for (const pollId of pollIds) {
      await db.delete(polls).where(eq(polls.id, pollId))
    }

    console.log(`Successfully deleted ${pollsToDelete.length} polls`)

    return NextResponse.json({
      success: true,
      message: `Deleted ${pollsToDelete.length} polls older than 30 days`,
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

    // Calculate the cutoff date (30 days ago)
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
