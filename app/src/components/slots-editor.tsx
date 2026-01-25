'use client'

import { useEffect, useMemo, useState } from 'react'
import { DayPilot, DayPilotCalendar } from '@daypilot/daypilot-lite-react'

export type EditableSlot = {
  id: string
  start: Date
  end: Date | null
  locked?: boolean
}

type SlotsEditorProps = {
  slots: EditableSlot[]
  onChange: (next: EditableSlot[]) => void
  readOnly?: boolean
}

function buildId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `slot_${Math.random().toString(36).slice(2)}`
}

function toDayPilotDate(value: Date) {
  return new DayPilot.Date(value, true)
}

function isHalfHour(date: DayPilot.Date) {
  return date.getMinutes() % 30 === 0 && date.getSeconds() === 0
}

function normalizeToHalfHour(date: DayPilot.Date) {
  const local = date.toDateLocal()
  local.setSeconds(0, 0)
  const minutes = local.getMinutes()
  const rounded = Math.round(minutes / 30) * 30
  if (rounded === 60) {
    local.setHours(local.getHours() + 1)
    local.setMinutes(0)
  } else {
    local.setMinutes(rounded)
  }
  return new DayPilot.Date(local, true)
}

export function SlotsEditor({ slots, onChange, readOnly }: SlotsEditorProps) {
  const [viewType, setViewType] = useState<'Week' | 'Day'>('Week')
  const [startDate, setStartDate] = useState(DayPilot.Date.today())
  const [tzLabel, setTzLabel] = useState<string | null>(null)
  const [durationMode, setDurationMode] = useState<
    number | 'custom' | 'allday'
  >(60)

  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const tzOffsetMinutes = new Date().getTimezoneOffset()
    const tzHours = Math.abs(tzOffsetMinutes / 60)
    const tzSign = tzOffsetMinutes <= 0 ? '+' : '-'
    setTzLabel(`${timezone} (UTC${tzSign}${tzHours})`)
  }, [])

  const events = useMemo(() => {
    const sorted = [...slots].sort((a, b) => a.start.getTime() - b.start.getTime())
    return sorted.map((slot, index) => ({
      id: slot.id,
      text: slot.locked ? `Slot ${index + 1} (Locked)` : `Slot ${index + 1}`,
      start: toDayPilotDate(slot.start),
      end: slot.end
        ? toDayPilotDate(slot.end)
        : toDayPilotDate(slot.start).addMinutes(30),
      locked: !!slot.locked,
      moveDisabled: !!slot.locked,
      resizeDisabled: !!slot.locked,
      backColor: slot.locked ? '#d1d5db' : undefined,
      borderColor: slot.locked ? '#9ca3af' : undefined,
      fontColor: slot.locked ? '#111827' : undefined,
              areas: slot.locked
        ? []
        : [
            {
              id: 'delete',
              right: 6,
              top: 6,
              width: 14,
              height: 14,
              html: '×',
              cssClass: 'dp-delete',
              action: 'None' as const,
              onClick: (args: any) => {
                if (!window.confirm('Remove this slot?')) return
                onChange(slots.filter((s) => s.id !== args.source.data.id))
              },
            },
          ],
    }))
  }, [slots])

  const handleTimeRangeSelected = (args: any) => {
    if (readOnly) return
    let start = normalizeToHalfHour(args.start)
    let end: DayPilot.Date
    const selectedMinutes = Math.max(0, args.end.getTime() - args.start.getTime()) / 60000
    const isPainted = selectedMinutes > 30

    if (!isPainted && durationMode === 'custom') {
      setDurationMode(60)
    }

    if (durationMode === 'allday') {
      const startLocal = start.toDateLocal()
      startLocal.setHours(0, 0, 0, 0)
      start = new DayPilot.Date(startLocal, true)
      end = start.addDays(1)
    } else if (isPainted) {
      end = normalizeToHalfHour(args.end)
      if (end.getTime() <= start.getTime()) {
        end = start.addMinutes(30)
      }
      if (isPainted && durationMode !== 'custom') {
        setDurationMode('custom')
      }
    } else {
      const minutes = durationMode === 'custom' ? 60 : durationMode
      end = start.addMinutes(minutes)
    }

    onChange([
      ...slots,
      {
        id: buildId(),
        start: start.toDateLocal(),
        end: end.toDateLocal(),
      },
    ])
    args.control.clearSelection()
  }

  const handleEventMoved = (args: any) => {
    if (readOnly) return
    if (args.e?.data?.locked) return
    const start = normalizeToHalfHour(args.newStart)
    let end = normalizeToHalfHour(args.newEnd)
    if (end.getTime() <= start.getTime()) {
      end = start.addMinutes(30)
    }

    onChange(
      slots.map((slot) =>
        slot.id === args.e.data.id
          ? { ...slot, start: start.toDateLocal(), end: end.toDateLocal() }
          : slot
      )
    )
  }

  const handleEventResized = (args: any) => {
    if (readOnly) return
    if (args.e?.data?.locked) return
    const start = normalizeToHalfHour(args.newStart)
    let end = normalizeToHalfHour(args.newEnd)
    if (end.getTime() <= start.getTime()) {
      end = start.addMinutes(30)
    }

    onChange(
      slots.map((slot) =>
        slot.id === args.e.data.id
          ? { ...slot, start: start.toDateLocal(), end: end.toDateLocal() }
          : slot
      )
    )
    setDurationMode('custom')
  }

  const handleEventClick = (args: any) => {
    if (readOnly) return
    if (args.e?.data?.locked) return
    if (!window.confirm('Remove this slot?')) return
    onChange(slots.filter((slot) => slot.id !== args.e.data.id))
  }

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
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Duration</span>
          {[30, 60, 90, 120, 180].map((minutes) => (
            <button
              key={minutes}
              className={`px-2 py-1 rounded-md border text-xs ${
                durationMode === minutes ? 'bg-primary text-primary-foreground' : ''
              }`}
              onClick={() => setDurationMode(minutes)}
            >
              {minutes === 60 ? '1 h' : minutes === 120 ? '2 h' : minutes === 180 ? '3 h' : `${minutes} min`}
            </button>
          ))}
          <button
            className={`px-2 py-1 rounded-md border text-xs ${
              durationMode === 'allday' ? 'bg-primary text-primary-foreground' : ''
            }`}
            onClick={() => setDurationMode('allday')}
          >
            All day
          </button>
          <button
            className={`px-2 py-1 rounded-md border text-xs ${
              durationMode === 'custom' ? 'bg-primary text-primary-foreground' : ''
            }`}
            onClick={() => setDurationMode('custom')}
          >
            Custom
          </button>
        </div>
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
        timeRangeSelectedHandling={readOnly ? 'Disabled' : 'Enabled'}
        eventMoveHandling={readOnly ? 'Disabled' : 'Update'}
        eventResizeHandling={readOnly ? 'Disabled' : 'Update'}
        eventClickHandling={readOnly ? 'Disabled' : 'Enabled'}
        weekStarts={1}
        onTimeRangeSelected={handleTimeRangeSelected}
        onEventMoved={handleEventMoved}
        onEventResized={handleEventResized}
        onEventClick={handleEventClick}
        onBeforeHeaderRender={(args) => {
          args.header.html = formatHeader(args.header.start)
        }}
        timeFormat="Clock24Hours"
        cellDuration={30}
        snapToGrid
        theme="calendar_default"
        locale="fi-fi"
      />
    </div>
  )
}
