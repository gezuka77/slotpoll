import { notFound } from 'next/navigation'
import { db } from '@/db'
import { polls, slots, users } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'
import { Header } from '@/components/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PollVotingForm } from '@/components/poll-voting-form'
import { PollResults } from '@/components/poll-results'
import { Calendar, MapPin, User, Clock, Users, AlertCircle } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth/session'
import { ShareLinkButton } from '@/components/share-link-button'
import { PollOwnerControls } from './PollOwnerControls'
import { SlotsCalendar } from '@/components/slots-calendar'
import { PollHeaderEditor } from './PollHeaderEditor'
import { ClientDateTime } from '@/components/client-datetime'

const DEMO_LINK = 'demo'
const DEMO_TTL_DAYS = 7

function buildDemoSlots(base: Date) {
  const slotsToCreate: { startTime: Date; endTime: Date }[] = []
  for (let i = 1; i <= 3; i += 1) {
    const day = new Date(base)
    day.setDate(base.getDate() + i)
    day.setHours(10, 0, 0, 0)
    const endMorning = new Date(day)
    endMorning.setHours(11, 0, 0, 0)
    slotsToCreate.push({ startTime: new Date(day), endTime: endMorning })

    const afternoon = new Date(base)
    afternoon.setDate(base.getDate() + i)
    afternoon.setHours(14, 0, 0, 0)
    const endAfternoon = new Date(afternoon)
    endAfternoon.setHours(15, 30, 0, 0)
    slotsToCreate.push({ startTime: new Date(afternoon), endTime: endAfternoon })
  }
  return slotsToCreate
}

function getDaysUntilDeletion(closedAt: Date | null): number | null {
  if (!closedAt) return null
  const deletionDate = new Date(closedAt)
  deletionDate.setDate(deletionDate.getDate() + 30)
  const now = new Date()
  const daysRemaining = Math.ceil((deletionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return daysRemaining
}

export default async function PollPage({ params }: { params: Promise<{ uniqueLink: string }> }) {
  const { uniqueLink } = await params
  if (uniqueLink === DEMO_LINK) {
    const existing = await db.query.polls.findFirst({
      where: eq(polls.uniqueLink, DEMO_LINK),
    })

    const now = new Date()
    const ttl = new Date(now)
    ttl.setDate(ttl.getDate() - DEMO_TTL_DAYS)

    let pollId = existing?.id

    if (existing && existing.createdAt < ttl) {
      await db.delete(polls).where(eq(polls.id, existing.id))
      pollId = undefined
    }

    if (!pollId) {
      const creator =
        (await db.query.users.findFirst({
          where: eq(users.role, 'super_user'),
          orderBy: [desc(users.createdAt)],
        })) ||
        (await db.query.users.findFirst({ orderBy: [desc(users.createdAt)] }))

      if (!creator) {
        return (
          <div className="min-h-screen">
            <Header />
            <main className="container mx-auto px-4 py-10 max-w-xl">
              <Card>
                <CardHeader>
                  <CardTitle>Demo unavailable</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  A demo poll can be created after the first user signs in. Please sign in and try again.
                </CardContent>
              </Card>
            </main>
          </div>
        )
      }

      const [created] = await db
        .insert(polls)
        .values({
          title: 'Team Sync Demo',
          description: 'Try voting on a few sample time slots to see how SlotPoll works.',
          location: 'Online Meeting',
          creatorId: creator.id,
          uniqueLink: DEMO_LINK,
          status: 'active',
        })
        .returning()

      const demoSlots = buildDemoSlots(now).map((slot) => ({
        pollId: created.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
      }))
      await db.insert(slots).values(demoSlots)
    }
  }
  const poll = await db.query.polls.findFirst({
    where: eq(polls.uniqueLink, uniqueLink),
    with: {
      creator: true,
      slots: {
        with: {
          votes: {
            with: {
              participant: true,
            },
          },
        },
        orderBy: (slots, { asc }) => [asc(slots.startTime)],
      },
      participants: {
        with: {
          votes: true,
        },
      },
      comments: {
        with: {
          participant: true,
        },
        orderBy: (comments, { desc }) => [desc(comments.createdAt)],
      },
    },
  })

  if (!poll) {
    notFound()
  }

  const user = await getCurrentUser()
  const isCreator = user?.id === poll.creatorId
  const baseUrl = (process.env.APP_URL || process.env.NEXTAUTH_URL || '').replace(/\/$/, '')
  const shareUrl = baseUrl ? `${baseUrl}/polls/${poll.uniqueLink}` : `/polls/${poll.uniqueLink}`

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-none">
        <div className="mx-auto max-w-5xl">
          {/* Poll Header */}
          <Card className="mb-6">
            {isCreator ? (
              <PollHeaderEditor
                pollId={poll.id}
                title={poll.title}
                description={poll.description}
                location={poll.location}
                status={poll.status}
                createdAt={poll.createdAt}
                ownerLabel={
                  uniqueLink === DEMO_LINK
                    ? 'demo@example.com'
                    : poll.creator?.name || poll.creator?.email || 'Unknown owner'
                }
                slotsCount={poll.slots.length}
                responsesCount={poll.participants.length}
                shareUrl={shareUrl}
              />
            ) : (
              <>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-3xl mb-2">{poll.title}</CardTitle>
                      <CardDescription className="text-base">
                        {poll.description || 'No description'}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          poll.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : poll.status === 'closed'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {poll.status}
                      </span>
                      <ShareLinkButton url={shareUrl} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <User className="mr-1 h-4 w-4" />
                      {poll.creator?.name || poll.creator?.email || 'Unknown owner'}
                    </div>
                    <div className="flex items-center">
                      <MapPin className="mr-1 h-4 w-4" />
                      {poll.location || 'No location'}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="mr-1 h-4 w-4" />
                      {poll.slots.length} time {poll.slots.length === 1 ? 'option' : 'options'}
                    </div>
                    <div className="flex items-center">
                      <Users className="mr-1 h-4 w-4" />
                      {poll.participants.length} {poll.participants.length === 1 ? 'response' : 'responses'}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="mr-1 h-4 w-4" />
                      Created
                      <span className="ml-1">
                        <ClientDateTime value={poll.createdAt} />
                      </span>
                    </div>
                  </div>
                </CardContent>
              </>
            )}
          </Card>
        </div>

        {/* Deletion countdown banner for closed polls */}
        {poll.status === 'closed' && poll.closedAt && (() => {
          const daysRemaining = getDaysUntilDeletion(poll.closedAt)
          if (daysRemaining === null) return null
          const wasAutoClosed = Boolean(poll.autoClosedAt)

          return (
            <div className="mx-auto max-w-5xl mt-6">
              <Card className={`border-2 ${daysRemaining <= 7 ? 'border-amber-500 bg-amber-50' : daysRemaining <= 0 ? 'border-red-500 bg-red-50' : 'border-blue-500 bg-blue-50'}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className={`h-5 w-5 mt-0.5 ${daysRemaining <= 7 ? 'text-amber-600' : daysRemaining <= 0 ? 'text-red-600' : 'text-blue-600'}`} />
                    <div className="flex-1">
                      <h3 className={`font-semibold mb-1 ${daysRemaining <= 7 ? 'text-amber-900' : daysRemaining <= 0 ? 'text-red-900' : 'text-blue-900'}`}>
                        {daysRemaining <= 0
                          ? 'Poll Deletion Pending'
                          : wasAutoClosed
                          ? 'Poll Automatically Closed'
                          : 'Poll Will Be Deleted Soon'}
                      </h3>
                      <p className={`text-sm ${daysRemaining <= 7 ? 'text-amber-800' : daysRemaining <= 0 ? 'text-red-800' : 'text-blue-800'}`}>
                        {daysRemaining <= 0 ? (
                          <>This poll is scheduled for automatic deletion. It was closed and will be permanently removed for GDPR compliance.</>
                        ) : wasAutoClosed ? (
                          <>
                            This poll was automatically closed because all proposed times have passed. It will be deleted in <strong>{daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}</strong> for GDPR compliance. {isCreator && 'You can reopen the poll to add new times and reset the deletion timer.'}
                          </>
                        ) : (
                          <>This poll will be automatically deleted in <strong>{daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}</strong> for GDPR compliance (30 days after closing). {isCreator && 'You can reopen the poll to reset the deletion timer.'}</>
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        })()}

        {isCreator && (
          <div className="mx-auto max-w-5xl mt-6">
            <PollOwnerControls
              pollId={poll.id}
              status={poll.status}
              slots={poll.slots}
            />
          </div>
        )}

        <div className="mx-auto max-w-5xl">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Calendar</CardTitle>
              <CardDescription>All available slots in your local time.</CardDescription>
            </CardHeader>
            <CardContent>
              <SlotsCalendar slots={poll.slots} />
            </CardContent>
          </Card>
        </div>

        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Voting Form */}
            <div>
              <PollVotingForm poll={poll} />
            </div>

            {/* Results */}
            <div>
              <PollResults poll={poll} isCreator={isCreator} />
            </div>
          </div>

          {/* Comments Section */}
          {poll.allowComments && poll.comments.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Comments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {poll.comments.map((comment) => (
                  <div key={comment.id} className="border-b last:border-0 pb-4 last:pb-0">
                    <div className="font-medium">{comment.participant.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">{comment.content}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
