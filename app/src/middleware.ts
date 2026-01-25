import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function middleware(_request: NextRequest) {
  // Auth is enforced in server components (database sessions aren't supported in NextAuth middleware).
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
