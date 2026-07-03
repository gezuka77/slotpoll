import { db } from '@/db'
import { lifetimeStats, participants, polls, slots, users, votes } from '@/db/schema'
import { eq, inArray, sql } from 'drizzle-orm'

const STATS_ID = 'global'

export type DeletedEntityCounts = {
  deletedUsers?: number
  deletedPolls?: number
  deletedSlots?: number
  deletedParticipants?: number
  deletedVotes?: number
}

export type StoredDeletedEntityCounts = Required<DeletedEntityCounts>

function normalizeCounts(counts: DeletedEntityCounts): StoredDeletedEntityCounts {
  return {
    deletedUsers: counts.deletedUsers || 0,
    deletedPolls: counts.deletedPolls || 0,
    deletedSlots: counts.deletedSlots || 0,
    deletedParticipants: counts.deletedParticipants || 0,
    deletedVotes: counts.deletedVotes || 0,
  }
}

function hasAnyCount(counts: StoredDeletedEntityCounts) {
  return Object.values(counts).some((count) => count > 0)
}

async function getCount(query: Promise<Array<{ count: number }>>) {
  const [row] = await query
  return Number(row?.count || 0)
}

export async function getDeletedEntityCounts(): Promise<StoredDeletedEntityCounts> {
  const [row] = await db
    .select({
      deletedUsers: lifetimeStats.deletedUsers,
      deletedPolls: lifetimeStats.deletedPolls,
      deletedSlots: lifetimeStats.deletedSlots,
      deletedParticipants: lifetimeStats.deletedParticipants,
      deletedVotes: lifetimeStats.deletedVotes,
    })
    .from(lifetimeStats)
    .where(eq(lifetimeStats.id, STATS_ID))

  return normalizeCounts(row || {})
}

export async function addDeletedEntityCounts(counts: DeletedEntityCounts) {
  const normalized = normalizeCounts(counts)
  if (!hasAnyCount(normalized)) return

  await db
    .insert(lifetimeStats)
    .values({
      id: STATS_ID,
      ...normalized,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: lifetimeStats.id,
      set: {
        deletedUsers: sql`${lifetimeStats.deletedUsers} + ${normalized.deletedUsers}`,
        deletedPolls: sql`${lifetimeStats.deletedPolls} + ${normalized.deletedPolls}`,
        deletedSlots: sql`${lifetimeStats.deletedSlots} + ${normalized.deletedSlots}`,
        deletedParticipants: sql`${lifetimeStats.deletedParticipants} + ${normalized.deletedParticipants}`,
        deletedVotes: sql`${lifetimeStats.deletedVotes} + ${normalized.deletedVotes}`,
        updatedAt: new Date(),
      },
    })
}

export async function countPollRowsForDeletion(pollIds: string[]): Promise<StoredDeletedEntityCounts> {
  if (pollIds.length === 0) {
    return normalizeCounts({})
  }

  const deletedPolls = await getCount(
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(polls)
      .where(inArray(polls.id, pollIds))
  )
  const deletedSlots = await getCount(
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(slots)
      .where(inArray(slots.pollId, pollIds))
  )
  const deletedParticipants = await getCount(
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(participants)
      .where(inArray(participants.pollId, pollIds))
  )
  const deletedVotes = await getCount(
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(votes)
      .innerJoin(slots, eq(votes.slotId, slots.id))
      .where(inArray(slots.pollId, pollIds))
  )

  return {
    deletedUsers: 0,
    deletedPolls,
    deletedSlots,
    deletedParticipants,
    deletedVotes,
  }
}

export async function recordPollRowsForDeletion(pollIds: string[]) {
  await addDeletedEntityCounts(await countPollRowsForDeletion(pollIds))
}

export async function recordUserRowsForDeletion(userId: string) {
  const deletedUsers = await getCount(
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.id, userId))
  )
  const userPolls = await db
    .select({ id: polls.id })
    .from(polls)
    .where(eq(polls.creatorId, userId))
  const pollCounts = await countPollRowsForDeletion(userPolls.map((poll) => poll.id))

  await addDeletedEntityCounts({
    ...pollCounts,
    deletedUsers,
  })
}
