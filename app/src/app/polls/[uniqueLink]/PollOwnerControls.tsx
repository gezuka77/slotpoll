'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock, Save, Trash2, Unlock } from 'lucide-react'
import { SlotsEditor, type EditableSlot } from '@/components/slots-editor'

export function PollOwnerControls({
  pollId,
  status,
  slots,
}: {
  pollId: string
  status: string
  slots: {
    id: string
    startTime: string | Date
    endTime: string | Date | null
    votes?: { id: string }[]
  }[]
}) {
  const router = useRouter()
  const initialSlots = useMemo<EditableSlot[]>(
    () =>
      slots.map((slot) => ({
        id: slot.id,
        start: slot.startTime instanceof Date ? slot.startTime : new Date(slot.startTime),
        end: slot.endTime ? new Date(slot.endTime) : null,
        locked: slot.votes ? slot.votes.length > 0 : false,
      })),
    [slots]
  )

  const [mounted, setMounted] = useState(false)
  const [items, setItems] = useState<EditableSlot[]>(initialSlots)
  const [saving, setSaving] = useState(false)
  const [closing, setClosing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      if (items.length === 0) {
        throw new Error('Add at least one time slot.')
      }

      const normalizeToHalfHour = (date: Date) => {
        const next = new Date(date)
        next.setSeconds(0, 0)
        const minutes = next.getMinutes()
        const rounded = Math.round(minutes / 30) * 30
        if (rounded === 60) {
          next.setHours(next.getHours() + 1)
          next.setMinutes(0)
        } else {
          next.setMinutes(rounded)
        }
        return next
      }

      const normalizedItems = items.map((slot) => {
        if (slot.locked) return slot
        const start = normalizeToHalfHour(slot.start)
        const end = slot.end ? normalizeToHalfHour(slot.end) : null
        return { ...slot, start, end }
      })

      setItems(normalizedItems)

      const response = await fetch(`/api/polls/${pollId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slots: normalizedItems.map((slot) => ({
            id: slot.id,
            startTimeIso: slot.start.toISOString(),
            endTimeIso: slot.end ? slot.end.toISOString() : null,
          })),
        }),
      })

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        let message = 'Failed to update slots'
        try {
          const data = text ? JSON.parse(text) : null
          message = data?.error || message
        } catch {
          if (text) message = text
        }
        throw new Error(message)
      }

      router.refresh()
    } catch (error) {
      console.error('Failed to update slots:', error)
      alert(error instanceof Error ? error.message : 'Failed to update slots. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = async () => {
    if (!window.confirm('Close this poll? People will no longer be able to vote.\n\nThe poll will be automatically deleted 30 days after closing for GDPR compliance.')) {
      return
    }
    setClosing(true)
    try {
      const response = await fetch(`/api/polls/${pollId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      })

      if (!response.ok) {
        throw new Error('Failed to close poll')
      }

      router.refresh()
    } catch (error) {
      console.error('Failed to close poll:', error)
      alert('Failed to close poll. Please try again.')
    } finally {
      setClosing(false)
    }
  }

  const handleReopen = async () => {
    setClosing(true)
    try {
      const response = await fetch(`/api/polls/${pollId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })

      if (!response.ok) {
        throw new Error('Failed to reopen poll')
      }

      router.refresh()
    } catch (error) {
      console.error('Failed to reopen poll:', error)
      alert('Failed to reopen poll. Please try again.')
    } finally {
      setClosing(false)
    }
  }

  const handleDeletePoll = async () => {
    if (
      !window.confirm(
        'Delete this poll? This will remove all slots and votes. This cannot be undone.'
      )
    ) {
      return
    }
    setDeleting(true)
    try {
      const response = await fetch(`/api/polls/${pollId}`, { method: 'DELETE' })
      if (!response.ok) {
        const text = await response.text().catch(() => '')
        let message = 'Failed to delete poll'
        try {
          const data = text ? JSON.parse(text) : null
          message = data?.error || message
        } catch {
          if (text) message = text
        }
        throw new Error(message)
      }
      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      console.error('Failed to delete poll:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete poll. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setItems(initialSlots)
  }, [initialSlots])

  if (!mounted) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Owner controls</CardTitle>
          <CardDescription>Loading…</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-10 rounded-md border bg-muted/40" />
          <div className="h-10 rounded-md border bg-muted/40" />
        </CardContent>
      </Card>
    )
  }

  const isClosed = status === 'closed'

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Owner controls</CardTitle>
        <CardDescription>
          Drag to create slots. Click a slot to remove it. Drag or resize to adjust. Locked slots
          (with votes) can’t be edited. Voting and results are shown below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SlotsEditor slots={items} onChange={setItems} readOnly={isClosed} />

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={handleSave} disabled={isClosed || saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          {isClosed ? (
            <Button type="button" onClick={handleReopen} disabled={closing}>
              <Unlock className="mr-2 h-4 w-4" />
              Reopen poll
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleClose}
              disabled={closing}
              className="bg-orange-500 text-white hover:bg-orange-600"
            >
              <Lock className="mr-2 h-4 w-4" />
              Close poll
            </Button>
          )}
          <Button
            type="button"
            variant="destructive"
            onClick={handleDeletePoll}
            disabled={deleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {deleting ? 'Deleting…' : 'Delete poll'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
