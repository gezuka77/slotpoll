import { NextResponse } from 'next/server'

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    message: 'Debug session endpoint is only available in development.',
  })
}
