'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, MapPin, Users, User, Clock } from 'lucide-react'
import { ShareLinkButton } from '@/components/share-link-button'
import { ClientDateTime } from '@/components/client-datetime'

type Props = {
  pollId: string
  title: string
  description: string | null
  location: string | null
  status: string
  ownerLabel: string
  slotsCount: number
  responsesCount: number
  shareUrl: string
  createdAt?: string | Date
}

export function PollHeaderEditor({
  pollId,
  title,
  description,
  location,
  status,
  ownerLabel,
  slotsCount,
  responsesCount,
  shareUrl,
  createdAt,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [titleValue, setTitleValue] = useState(title)
  const [descriptionValue, setDescriptionValue] = useState(description || '')
  const normalizedLocation = location || ''
  const presetOptions = ['Teams', 'Zoom', 'Other online', 'In-person']
  const initialLocationType = presetOptions.includes(normalizedLocation) ? normalizedLocation : ''
  const [locationType, setLocationType] = useState(initialLocationType)

  const handleSave = async () => {
    if (!titleValue.trim()) {
      alert('Title is required')
      return
    }
    const resolvedLocation = locationType
    setSaving(true)
    try {
      const res = await fetch(`/api/polls/${pollId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titleValue,
          description: descriptionValue,
          location: resolvedLocation,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Failed to update poll')
      }
      setEditing(false)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update poll')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {editing ? (
              <div className="space-y-3">
                <Input value={titleValue} onChange={(e) => setTitleValue(e.target.value)} />
                <Textarea
                  rows={2}
                  value={descriptionValue}
                  onChange={(e) => setDescriptionValue(e.target.value)}
                  placeholder="Description"
                />
                <div className="space-y-2">
                  <select
                    value={locationType}
                    onChange={(e) => setLocationType(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">No location</option>
                    <option value="Teams">Teams</option>
                    <option value="Zoom">Zoom</option>
                    <option value="Other online">Other online</option>
                    <option value="In-person">In-person</option>
                  </select>
                </div>
              </div>
            ) : (
              <>
                <CardTitle className="text-3xl mb-2">{titleValue}</CardTitle>
                <CardDescription className="text-base">
                  {descriptionValue || 'No description'}
                </CardDescription>
              </>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : status === 'closed'
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {status}
            </span>
            <ShareLinkButton url={shareUrl} />
            {editing ? (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                Edit details
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center">
            <User className="mr-1 h-4 w-4" />
            {ownerLabel}
          </div>
          <div className="flex items-center">
            <MapPin className="mr-1 h-4 w-4" />
            {locationType || 'No location'}
          </div>
          <div className="flex items-center">
            <Calendar className="mr-1 h-4 w-4" />
            {slotsCount} time {slotsCount === 1 ? 'option' : 'options'}
          </div>
          <div className="flex items-center">
            <Users className="mr-1 h-4 w-4" />
            {responsesCount} {responsesCount === 1 ? 'response' : 'responses'}
          </div>
          {createdAt && (
            <div className="flex items-center">
              <Clock className="mr-1 h-4 w-4" />
              Created
              <span className="ml-1">
                <ClientDateTime value={createdAt} />
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </>
  )
}
