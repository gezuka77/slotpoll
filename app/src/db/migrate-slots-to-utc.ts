import postgres from 'postgres'

type SlotRow = {
  id: string
  start_time: string
  end_time: string | null
}

type DateParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

function parseTimestamp(value: string): DateParts | null {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/
  )
  if (!match) return null
  const [, year, month, day, hour, minute, second] = match
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
  }
}

function getTimeZoneOffset(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const values: Record<string, string> = {}
  for (const part of parts) {
    if (part.type !== 'literal') values[part.type] = part.value
  }

  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  )

  return (asUtc - date.getTime()) / 60000
}

function zonedTimeToUtc(parts: DateParts, timeZone: string) {
  let guess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  )

  let offset = getTimeZoneOffset(new Date(guess), timeZone)
  let adjusted = guess - offset * 60000
  offset = getTimeZoneOffset(new Date(adjusted), timeZone)
  adjusted = guess - offset * 60000

  return new Date(adjusted)
}

async function main() {
  const shouldApply = process.argv.includes('--apply')
  const timeZoneArg = process.argv.find((arg) => arg.startsWith('--tz='))
  const timeZone = timeZoneArg ? timeZoneArg.split('=')[1] : 'UTC'

  const sql = postgres(process.env.DATABASE_URL || '')
  try {
    const rows = await sql<SlotRow[]>`
      select id, "startTime"::text as start_time, "endTime"::text as end_time
      from slots
      order by "startTime" asc
    `

    let updated = 0
    for (const row of rows) {
      const startParts = parseTimestamp(row.start_time)
      const endParts = row.end_time ? parseTimestamp(row.end_time) : null

      if (!startParts) {
        console.warn(`Skipping slot ${row.id}: unparseable startTime`)
        continue
      }

      const startUtc = zonedTimeToUtc(startParts, timeZone)
      const endUtc = endParts ? zonedTimeToUtc(endParts, timeZone) : null

      if (shouldApply) {
        await sql`
          update slots
          set "startTime" = ${startUtc}, "endTime" = ${endUtc}
          where id = ${row.id}
        `
      }

      updated += 1
    }

    if (shouldApply) {
      console.log(`Updated ${updated} slot(s) to UTC using ${timeZone}.`)
    } else {
      console.log(
        `Dry run: would update ${updated} slot(s) to UTC using ${timeZone}.`
      )
      console.log('Run with --apply to write changes.')
    }
  } finally {
    await sql.end()
  }
}

main().catch((error) => {
  console.error('Migration failed:', error)
  process.exit(1)
})
