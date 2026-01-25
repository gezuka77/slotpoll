'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Header } from '@/components/header'
import { SlotsEditor, type EditableSlot } from '@/components/slots-editor'
import { Plus } from 'lucide-react'

export default function CreatePollClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  })
  const [locationType, setLocationType] = useState('')
  const [slots, setSlots] = useState<EditableSlot[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (slots.length === 0) {
        throw new Error('Add at least one time slot.')
      }

      const resolvedLocation = locationType
      const response = await fetch('/api/polls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          location: resolvedLocation,
          slots: slots.map((slot) => ({
            startTimeIso: slot.start.toISOString(),
            endTimeIso: slot.end ? slot.end.toISOString() : null,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create poll')
      }

      const data = await response.json()
      router.push(`/polls/${data.uniqueLink}`)
    } catch (error) {
      console.error('Error creating poll:', error)
      alert(error instanceof Error ? error.message : 'Failed to create poll. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-none">
        <div className="mx-auto max-w-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Create New Poll</h1>
            <p className="text-muted-foreground">Set up your poll details and add time slots</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="mx-auto max-w-5xl">
            <Card>
              <CardHeader>
                <CardTitle>Poll Details</CardTitle>
                <CardDescription>
                  Provide information about your poll
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Poll Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Team Meeting Schedule"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Discuss project updates and next steps"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <select
                    id="location"
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
              </CardContent>
            </Card>
          </div>

          <div className="mx-auto max-w-5xl">
            <Card>
              <CardHeader>
                <CardTitle>Time Slots</CardTitle>
                <CardDescription>
                  Drag to create slots. Click a slot to remove it. Resize or move to adjust.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SlotsEditor slots={slots} onChange={setSlots} />
              </CardContent>
            </Card>
          </div>

          <div className="mx-auto max-w-5xl">
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              <Plus className="mr-2 h-4 w-4" />
              {loading ? 'Creating Poll...' : 'Create Poll'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
