'use client'

import { useEffect, useMemo, useState } from 'react'
import { DayPilot, DayPilotCalendar } from '@daypilot/daypilot-lite-react'

type SlotInput = {
  id: string
  startTime: string | Date
  endTime: string | Date | null
  title?: string
  locked?: boolean
  votes?: { voteType: 'yes' | 'no' | 'maybe' }[]
}

function toDayPilotDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)
  return new DayPilot.Date(date, true)
}

export function SlotsCalendar({ slots }: { slots: SlotInput[] }) {
  const [viewType, setViewType] = useState<'Week' | 'Day'>('Week')
  const [startDate, setStartDate] = useState(() => {
    const firstSlot = slots.length > 0 ? slots.reduce((min, slot) => {
      const current = new Date(slot.startTime)
      return current < min ? current : min
    }, new Date(slots[0].startTime)) : new Date()
    return new DayPilot.Date(firstSlot, true)
  })
  const [tzLabel, setTzLabel] = useState<string | null>(null)

  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const tzOffsetMinutes = new Date().getTimezoneOffset()
    const tzHours = Math.abs(tzOffsetMinutes / 60)
    const tzSign = tzOffsetMinutes <= 0 ? '+' : '-'
    setTzLabel(`${timezone} (UTC${tzSign}${tzHours})`)
  }, [])

  useEffect(() => {
    if (slots.length === 0) return
    const firstSlot = slots.reduce((min, slot) => {
      const current = new Date(slot.startTime)
      return current < min ? current : min
    }, new Date(slots[0].startTime))
    setStartDate(new DayPilot.Date(firstSlot, true))
  }, [slots])

  const events = useMemo(() => {
    const sorted = [...slots].sort((a, b) => {
      const aStart = new Date(a.startTime).getTime()
      const bStart = new Date(b.startTime).getTime()
      return aStart - bStart
    })
    const maxYesVotes = sorted.reduce((max, slot) => {
      const yesVotes = slot.votes?.filter((v) => v.voteType === 'yes').length || 0
      return Math.max(max, yesVotes)
    }, 0)
    return sorted.map((slot, index) => {
      const yesVotes = slot.votes?.filter((v) => v.voteType === 'yes').length || 0
      const maybeVotes = slot.votes?.filter((v) => v.voteType === 'maybe').length || 0
      const noVotes = slot.votes?.filter((v) => v.voteType === 'no').length || 0
      const startDate = new Date(slot.startTime)
      const endDate = slot.endTime ? new Date(slot.endTime) : new Date(startDate.getTime() + 30 * 60000)
      const voteSummary = `Yes ${yesVotes} · Maybe ${maybeVotes} · No ${noVotes}`
      return {
        id: slot.id,
        text: `Slot ${index + 1}\n${voteSummary}`,
        fontColor: slot.locked ? '#111827' : undefined,
        moveDisabled: true,
        resizeDisabled: true,
        start: toDayPilotDate(startDate),
        end: toDayPilotDate(endDate),
        backColor:
          yesVotes === maxYesVotes && maxYesVotes > 0
            ? '#fef3c7'
            : slot.locked
            ? '#d1d5db'
            : undefined,
        borderColor:
          yesVotes === maxYesVotes && maxYesVotes > 0
            ? '#f59e0b'
            : slot.locked
            ? '#9ca3af'
            : undefined,
      }
    })
  }, [slots])

  const navigate = (direction: number) => {
    const step = viewType === 'Day' ? 1 : 7
    setStartDate(startDate.addDays(direction * step))
  }

  const formatHeader = (date: DayPilot.Date) => {
    const d = date.toDateLocal()
    const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(d)
    const day = d.getDate()
    const month = d.getMonth() + 1
    const year = d.getFullYear()
    return `${weekday} ${day}.${month}.${year}`
  }

  const getIsoWeek = (date: Date) => {
    const target = new Date(date)
    target.setHours(0, 0, 0, 0)
    const day = (target.getDay() + 6) % 7
    target.setDate(target.getDate() - day + 3)
    const firstThursday = new Date(target.getFullYear(), 0, 4)
    const firstDay = (firstThursday.getDay() + 6) % 7
    firstThursday.setDate(firstThursday.getDate() - firstDay + 3)
    const diff = target.getTime() - firstThursday.getTime()
    return 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000))
  }
  const weekLabel = `Week ${getIsoWeek(startDate.toDateLocal())}`

  return (
    <div className="daypilot-wrap rounded-lg border bg-background p-4">
      <div className="flex flex-wrap items-center gap-3 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="px-3 py-1 rounded-md border text-sm"
            onClick={() => navigate(-1)}
          >
            Prev
          </button>
          <button
            className="px-3 py-1 rounded-md border text-sm"
            onClick={() => setStartDate(DayPilot.Date.today())}
          >
            Today
          </button>
          <button
            className="px-3 py-1 rounded-md border text-sm"
            onClick={() => navigate(1)}
          >
            Next
          </button>
        </div>
        <div className="flex-1" />
        <div className="ml-auto flex items-center gap-2">
          <button
            className={`px-3 py-1 rounded-md border text-sm ${
              viewType === 'Week' ? 'bg-primary text-primary-foreground' : ''
            }`}
            onClick={() => setViewType('Week')}
          >
            Week
          </button>
          <button
            className={`px-3 py-1 rounded-md border text-sm ${
              viewType === 'Day' ? 'bg-primary text-primary-foreground' : ''
            }`}
            onClick={() => setViewType('Day')}
          >
            Day
          </button>
          {tzLabel && (
            <span className="ml-2 text-xs text-muted-foreground">{tzLabel}</span>
          )}
        </div>
      </div>
      <div className="mb-3 flex items-center justify-between rounded-md border bg-muted/40 px-3 py-2 text-sm">
        <span className="font-medium text-foreground">{weekLabel}</span>
        <span className="text-xs text-muted-foreground">
          {viewType === 'Week' ? 'Week view' : 'Day view'}
        </span>
      </div>

      <DayPilotCalendar
        viewType={viewType}
        startDate={startDate}
        events={events}
        weekStarts={1}
        timeRangeSelectedHandling="Disabled"
        eventClickHandling="Disabled"
        eventMoveHandling="Disabled"
        eventResizeHandling="Disabled"
        onBeforeHeaderRender={(args) => {
          args.header.html = formatHeader(args.header.start)
        }}
        timeFormat="Clock24Hours"
        cellDuration={30}
        theme="calendar_default"
        locale="fi-fi"
      />
    </div>
  )
}
