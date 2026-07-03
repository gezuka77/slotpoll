import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/session'
import { db } from '@/db'
import { polls, participants, users } from '@/db/schema'
import { eq, desc, inArray, and, ne, sql } from 'drizzle-orm'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Plus, Calendar, Users, MapPin, User } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

function getDaysUntilDeletion(closedAt: Date | null): number | null {
  if (!closedAt) return null
  const deletionDate = new Date(closedAt)
  deletionDate.setDate(deletionDate.getDate() + 30)
  const now = new Date()
  const daysRemaining = Math.ceil((deletionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return daysRemaining
}

export default async function DashboardPage() {
  const user = await requireAuth()

  // Fetch user's polls
  const userPolls = await db.query.polls.findMany({
    where: and(eq(polls.creatorId, user.id), ne(polls.uniqueLink, 'demo')),
    orderBy: [desc(polls.createdAt)],
    with: {
      slots: true,
      participants: true,
      creator: true,
    },
  })

  const normalizedEmail = user.email ? user.email.trim().toLowerCase() : null
  const votedPollIds = normalizedEmail
    ? await db
        .select({ pollId: participants.pollId })
        .from(participants)
        .where(sql`lower(${participants.email}) = ${normalizedEmail}`)
    : []
  const uniqueVotedPollIds = Array.from(new Set(votedPollIds.map((row) => row.pollId)))
  const votedPolls =
    uniqueVotedPollIds.length > 0
      ? await db.query.polls.findMany({
          where: and(
            inArray(polls.id, uniqueVotedPollIds),
            ne(polls.creatorId, user.id),
            ne(polls.uniqueLink, 'demo')
          ),
          orderBy: [desc(polls.createdAt)],
          with: {
            slots: true,
            participants: true,
            creator: true,
          },
        })
      : []

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your polls and view responses
            </p>
          </div>
          <Link href="/polls/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Poll
            </Button>
          </Link>
        </div>

        <div className="mb-4">
          <h2 className="text-2xl font-semibold">Your polls</h2>
          <p className="text-muted-foreground">
            Polls you created and can manage.
          </p>
        </div>

        {userPolls.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No polls yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first poll to start collecting responses
              </p>
              <Link href="/polls/create">
                <Button>Create Your First Poll</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {userPolls.map((poll) => (
              <Link key={poll.id} href={`/polls/${poll.uniqueLink}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle className="line-clamp-1">{poll.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {poll.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Calendar className="mr-1 h-4 w-4" />
                        {poll.slots.length} slots
                      </div>
                      <div className="flex items-center">
                        <Users className="mr-1 h-4 w-4" />
                        {poll.participants.length} responses
                      </div>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-muted-foreground">
                      <User className="mr-1 h-4 w-4" />
                      {poll.creator?.name || poll.creator?.email || 'Unknown owner'}
                    </div>
                    <div className="mt-2 flex items-center text-sm text-muted-foreground">
                      <MapPin className="mr-1 h-4 w-4" />
                      {poll.location || 'No location'}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Created {formatDateTime(poll.createdAt)}
                    </div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          poll.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : poll.status === 'closed'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {poll.status}
                      </span>
                      {poll.status === 'closed' && poll.closedAt && (() => {
                        const daysRemaining = getDaysUntilDeletion(poll.closedAt)
                        if (daysRemaining === null) return null
                        if (daysRemaining <= 0) {
                          return (
                            <span className="text-xs text-red-600 font-medium">
                              ⚠️ Deletion pending
                            </span>
                          )
                        }
                        return (
                          <div className="flex flex-col gap-1 text-xs">
                            {poll.autoClosedAt && (
                              <span className="text-amber-700 font-medium">
                                Automatically closed after all times passed
                              </span>
                            )}
                            <span className={daysRemaining <= 7 ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>
                              🗑️ Auto-delete in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
                            </span>
                          </div>
                        )
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Separator */}
        <div className="my-12 border-t border-border"></div>

        <div className="mb-4">
          <h2 className="text-2xl font-semibold">Polls You Voted In</h2>
          <p className="text-muted-foreground">
            Polls you participated in as a voter.
          </p>
        </div>

        {normalizedEmail === null ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Add an email to your profile to see polls you&apos;ve voted in.
              </CardContent>
            </Card>
          ) : votedPolls.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                You haven&apos;t voted in any polls yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {votedPolls.map((poll) => (
                <Link key={poll.id} href={`/polls/${poll.uniqueLink}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader>
                      <CardTitle className="line-clamp-1">{poll.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {poll.description || 'No description'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Calendar className="mr-1 h-4 w-4" />
                        {poll.slots.length} slots
                      </div>
                      <div className="flex items-center">
                        <Users className="mr-1 h-4 w-4" />
                        {poll.participants.length} responses
                      </div>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-muted-foreground">
                      <User className="mr-1 h-4 w-4" />
                      {poll.creator?.name || poll.creator?.email || 'Unknown owner'}
                    </div>
                    <div className="mt-2 flex items-center text-sm text-muted-foreground">
                      <MapPin className="mr-1 h-4 w-4" />
                      {poll.location || 'No location'}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Created {formatDateTime(poll.createdAt)}
                    </div>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            poll.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : poll.status === 'closed'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {poll.status}
                        </span>
                        {poll.status === 'closed' && poll.closedAt && (() => {
                          const daysRemaining = getDaysUntilDeletion(poll.closedAt)
                          if (daysRemaining === null) return null
                          if (daysRemaining <= 0) {
                            return (
                              <span className="text-xs text-red-600 font-medium">
                                ⚠️ Deletion pending
                              </span>
                            )
                          }
                          return (
                            <div className="flex flex-col gap-1 text-xs">
                              {poll.autoClosedAt && (
                                <span className="text-amber-700 font-medium">
                                  Automatically closed after all times passed
                                </span>
                              )}
                              <span className={daysRemaining <= 7 ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>
                                🗑️ Auto-delete in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
                              </span>
                            </div>
                          )
                        })()}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
      </main>
    </div>
  )
}
