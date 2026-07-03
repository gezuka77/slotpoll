import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { db } from '@/db'
import { users, polls, participants, sessions, accounts } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { recordUserRowsForDeletion } from '@/lib/lifetime-stats'

export async function DELETE() {
  try {
    // Get current user
    const user = await getCurrentUser()
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id
    const userEmail = user.email
    await recordUserRowsForDeletion(userId)

    // Step 1: Anonymize participant data for GDPR compliance
    // This preserves poll integrity while removing personal information
    if (userEmail) {
      await db
        .update(participants)
        .set({
          name: 'Deleted User',
          email: null,
        })
        .where(eq(participants.email, userEmail))
    }

    // Step 2: Delete user's polls (CASCADE will handle slots, votes, comments, participants)
    await db.delete(polls).where(eq(polls.creatorId, userId))

    // Step 3: Delete sessions
    await db.delete(sessions).where(eq(sessions.userId, userId))

    // Step 4: Delete accounts (OAuth connections)
    await db.delete(accounts).where(eq(accounts.userId, userId))

    // Step 5: Delete user record
    await db.delete(users).where(eq(users.id, userId))

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting account:', error)
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}
