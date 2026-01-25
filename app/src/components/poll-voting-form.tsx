'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ClientDateTime } from '@/components/client-datetime'
import { CheckCircle2, XCircle, HelpCircle, Send, Trash2 } from 'lucide-react'

type VoteType = 'yes' | 'no' | 'maybe' | null

export function PollVotingForm({ poll }: { poll: any }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [statusMessage, setStatusMessage] = useState<{ text: string; tone: 'info' | 'success' | 'neutral' } | null>(
    null
  )
  const [votes, setVotes] = useState<Record<string, VoteType>>(
    poll.slots.reduce((acc: any, slot: any) => ({ ...acc, [slot.id]: null }), {})
  )
  const slotIds = poll.slots.map((slot: any) => slot.id)
  const allVoted = slotIds.every((id: string) => votes[id] !== null && votes[id] !== undefined)

  useEffect(() => {
    if (!session?.user) return
    if (!email && session.user.email) {
      setEmail(session.user.email)
    }
    if (!name && session.user.name) {
      setName(session.user.name)
    }
  }, [session, email, name])

  const handleVote = (slotId: string, voteType: VoteType) => {
    setVotes({ ...votes, [slotId]: votes[slotId] === voteType ? null : voteType })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatusMessage(null)

    try {
      const response = await fetch(`/api/polls/${poll.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, votes }),
      })

      if (!response.ok) throw new Error('Failed to submit votes')

      const data = await response.json().catch(() => null)
      router.refresh()
      if (data?.participant?.name) setName(data.participant.name)
      if (data?.participant?.email) setEmail(data.participant.email)
      setStatusMessage({
        text: 'Your vote is saved. You can update it anytime by submitting again.',
        tone: 'info',
      })
    } catch (error) {
      alert('Failed to submit votes. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!email) {
      alert('Enter your email to delete your vote.')
      return
    }
    if (!window.confirm('Delete your vote? This cannot be undone.')) {
      return
    }
    setDeleting(true)
    try {
      const response = await fetch(`/api/polls/${poll.id}/vote`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Failed to delete vote')
      }
      router.refresh()
      setVotes(poll.slots.reduce((acc: any, slot: any) => ({ ...acc, [slot.id]: null }), {}))
      setStatusMessage({ text: 'Your vote has been deleted.', tone: 'neutral' })
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete vote. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      if (!email) return
      try {
        const res = await fetch(`/api/polls/${poll.id}/vote?email=${encodeURIComponent(email)}`, {
          signal: controller.signal,
        })
        if (!res.ok) return
        const data = await res.json()
        if (data?.found) {
          setName(data.participant?.name || name)
          setVotes((prev) => {
            const next = { ...prev }
            Object.keys(next).forEach((key) => {
              next[key] = data.votes?.[key] || null
            })
            return next
          })
          setStatusMessage({ text: 'We loaded your previous vote. You can update it now.', tone: 'info' })
          return
        }

        const nameRes = await fetch(`/api/participants/name?email=${encodeURIComponent(email)}`, {
          signal: controller.signal,
        })
        if (!nameRes.ok) return
        const nameData = await nameRes.json()
        if (nameData?.found && nameData?.name && !name) {
          setName(nameData.name)
        }
      } catch {
        // ignore
      }
    }
    load()
    return () => controller.abort()
  }, [email, poll.id])

  if (poll.status === 'closed') {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">This poll is closed and no longer accepting responses.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cast Your Vote</CardTitle>
        <CardDescription>Select your availability for each time slot</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="John Doe"
              />
            </div>

            {poll.requireEmail && (
              <div className="space-y-2">
                <Label htmlFor="email">Email {poll.requireEmail && '*'}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required={poll.requireEmail}
                  placeholder="john@example.com"
                />
              </div>
            )}
            {!poll.requireEmail && (
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  required
                />
              </div>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            You must vote on all slots. Votes are linked to your email.
          </div>
          {statusMessage && (
            <div
              className={[
                'text-sm rounded-md px-3 py-2 border',
                statusMessage.tone === 'success' && 'text-green-700 bg-green-50 border-green-200',
                statusMessage.tone === 'info' && 'text-blue-700 bg-blue-50 border-blue-200',
                statusMessage.tone === 'neutral' && 'text-slate-700 bg-slate-50 border-slate-200',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {statusMessage.text}
            </div>
          )}

          <div className="space-y-3">
            <Label>Time Slots</Label>
            {[...poll.slots]
              .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
              .map((slot: any, index: number) => (
              <div key={slot.id} className="border rounded-lg p-4">
                <div className="font-medium mb-2">
                  <span className="mr-2 text-sm text-muted-foreground">Slot {index + 1}</span>
                  <ClientDateTime value={slot.startTime} />
                  {slot.endTime && (
                    <>
                      {' - '}
                      <ClientDateTime value={slot.endTime} />
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={votes[slot.id] === 'yes' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleVote(slot.id, 'yes')}
                    className={[
                      'flex-1',
                      votes[slot.id] === 'yes' && 'bg-green-600 border-green-600 text-white hover:bg-green-700',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    Yes
                  </Button>
                  {poll.allowMaybe && (
                    <Button
                      type="button"
                      variant={votes[slot.id] === 'maybe' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleVote(slot.id, 'maybe')}
                      className={[
                        'flex-1',
                        votes[slot.id] === 'maybe' && 'bg-yellow-500 border-yellow-500 text-white hover:bg-yellow-600',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <HelpCircle className="mr-1 h-4 w-4" />
                      Maybe
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant={votes[slot.id] === 'no' ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => handleVote(slot.id, 'no')}
                    className="flex-1"
                  >
                    <XCircle className="mr-1 h-4 w-4" />
                    No
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="submit" disabled={loading || !name || !allVoted} className="w-full">
              <Send className="mr-2 h-4 w-4" />
              {loading ? 'Submitting...' : 'Submit / Update Vote'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={deleting || !email}
              onClick={handleDelete}
              className="w-full"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deleting ? 'Deleting...' : 'Delete My Vote'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
