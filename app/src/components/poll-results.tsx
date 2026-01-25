 'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ClientDateTime } from '@/components/client-datetime'
import { CheckCircle2, XCircle, HelpCircle } from 'lucide-react'

export function PollResults({ poll, isCreator }: { poll: any; isCreator: boolean }) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  // Calculate vote counts for each slot
  const slotResults = poll.slots
    .map((slot: any) => {
    const yesVotes = slot.votes.filter((v: any) => v.voteType === 'yes').length
    const noVotes = slot.votes.filter((v: any) => v.voteType === 'no').length
    const maybeVotes = slot.votes.filter((v: any) => v.voteType === 'maybe').length
    const totalVotes = yesVotes + noVotes + maybeVotes

    return {
      ...slot,
      yesVotes,
      noVotes,
      maybeVotes,
      totalVotes,
      yesPercentage: totalVotes > 0 ? (yesVotes / totalVotes) * 100 : 0,
    }
  })

  // Compute max yes votes and sort by time
  const maxYesVotes = slotResults.reduce((max: number, slot: any) => Math.max(max, slot.yesVotes), 0)
  slotResults.sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  return (
    <Card>
      <CardHeader>
        <CardTitle>Results</CardTitle>
        <CardDescription>
          {poll.participants.length} {poll.participants.length === 1 ? 'person has' : 'people have'} responded
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {slotResults.map((slot: any, index: number) => {
          const isTop = maxYesVotes > 0 && slot.yesVotes === maxYesVotes
          return (
          <div
            key={slot.id}
            className={`border rounded-lg p-4 ${isTop ? 'border-amber-300 bg-amber-50' : ''}`}
          >
            <div className="font-medium mb-3">
              <span className="mr-2 text-sm text-muted-foreground">Slot {index + 1}</span>
              <ClientDateTime value={slot.startTime} />
              {slot.endTime && (
                <>
                  {' - '}
                  <ClientDateTime value={slot.endTime} />
                </>
              )}
              {isTop && (
                <span className="ml-2 inline-flex items-center rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-900">
                  Most voted
                </span>
              )}
            </div>

            <div className="space-y-2">
              {/* Yes votes */}
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Yes</span>
                    <span className="font-medium">{slot.yesVotes}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-600 transition-all"
                      style={{
                        width: `${slot.totalVotes > 0 ? (slot.yesVotes / slot.totalVotes) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Maybe votes */}
              {poll.allowMaybe && (
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-yellow-600" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Maybe</span>
                      <span className="font-medium">{slot.maybeVotes}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-600 transition-all"
                        style={{
                          width: `${slot.totalVotes > 0 ? (slot.maybeVotes / slot.totalVotes) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* No votes */}
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">No</span>
                    <span className="font-medium">{slot.noVotes}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-600 transition-all"
                      style={{
                        width: `${slot.totalVotes > 0 ? (slot.noVotes / slot.totalVotes) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Show participant names */}
            {slot.votes.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <div className="text-xs text-muted-foreground mb-2">Participants:</div>
                <div className="flex flex-wrap gap-1">
                  {slot.votes.map((vote: any) => (
                    <span
                      key={vote.id}
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                        vote.voteType === 'yes'
                          ? 'bg-green-100 text-green-800'
                          : vote.voteType === 'maybe'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {vote.participant.name}
                      {isCreator && (
                        <button
                          type="button"
                          className="ml-2 text-xs underline"
                          onClick={async () => {
                            if (!confirm(`Remove all votes for ${vote.participant.name}?`)) return
                            setDeletingId(vote.id)
                            try {
                              const res = await fetch(`/api/polls/${poll.id}/vote`, {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  name: vote.participant.name,
                                  email: vote.participant.email || null,
                                }),
                              })
                              if (!res.ok) {
                                const data = await res.json().catch(() => null)
                                throw new Error(data?.error || 'Failed to delete vote')
                              }
                              router.refresh()
                            } catch (error) {
                              alert(error instanceof Error ? error.message : 'Failed to delete vote')
                            } finally {
                              setDeletingId(null)
                            }
                          }}
                          disabled={deletingId === vote.id}
                          title="Remove this participant's votes"
                        >
                          {deletingId === vote.id ? '...' : 'Remove'}
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )})}

        {slotResults.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No time slots added yet
          </div>
        )}
      </CardContent>
    </Card>
  )
}
