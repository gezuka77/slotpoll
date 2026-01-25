import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { participants } from '@/db/schema'
import { desc, sql } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email')
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    if (!normalizedEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const match = await db.query.participants.findFirst({
      where: sql`lower(${participants.email}) = ${normalizedEmail}`,
      orderBy: [desc(participants.createdAt)],
    })

    if (!match) {
      return NextResponse.json({ found: false })
    }

    return NextResponse.json({ found: true, name: match.name })
  } catch (error) {
    console.error('Error fetching participant name:', error)
    return NextResponse.json({ error: 'Failed to fetch participant name' }, { status: 500 })
  }
}
