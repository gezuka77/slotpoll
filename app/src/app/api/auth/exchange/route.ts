import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { users, sessions, verificationTokens } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { createHash, randomUUID } from 'crypto'
import { checkRateLimit, sanitizeCallbackUrl } from '@/lib/security'

// Hash token the same way NextAuth does
function hashToken(token: string): string {
  const secret = process.env.NEXTAUTH_SECRET || ''
  return createHash('sha256')
    .update(`${token}${secret}`)
    .digest('hex')
}

export async function POST(request: NextRequest) {
  try {
    const { token, email, callbackUrl } = await request.json()

    if (!token || !email) {
      return NextResponse.json({ error: 'Missing token or email' }, { status: 400 })
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'
    const rate = checkRateLimit(`auth-exchange:${ip}`, 10, 10 * 60 * 1000)
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // Hash the token to match how NextAuth stores it
    const hashedToken = hashToken(token)

    // Find and validate the verification token
    const verificationToken = await db.query.verificationTokens.findFirst({
      where: and(
        eq(verificationTokens.identifier, email),
        eq(verificationTokens.token, hashedToken)
      ),
    })

    if (!verificationToken) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
    }

    // Check if token is expired
    if (new Date() > verificationToken.expires) {
      // Delete expired token
      await db.delete(verificationTokens).where(
        and(
          eq(verificationTokens.identifier, email),
          eq(verificationTokens.token, hashedToken)
        )
      )
      return NextResponse.json({ error: 'Token expired' }, { status: 400 })
    }

    // Delete the token (consume it)
    await db.delete(verificationTokens).where(
      and(
        eq(verificationTokens.identifier, email),
        eq(verificationTokens.token, hashedToken)
      )
    )

    // Find or create user
    let user = await db.query.users.findFirst({
      where: eq(users.email, email),
    })

    if (!user) {
      const [newUser] = await db.insert(users).values({
        email,
        emailVerified: new Date(),
      }).returning()
      user = newUser
    } else {
      // Update emailVerified if not already set
      if (!user.emailVerified) {
        await db.update(users).set({ emailVerified: new Date() }).where(eq(users.id, user.id))
      }
    }
    if (user.suspended) {
      return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
    }

    // Create session
    const sessionToken = randomUUID()
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    await db.insert(sessions).values({
      sessionToken,
      userId: user.id,
      expires,
    })

    const baseUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || ''
    const response = NextResponse.json({
      success: true,
      callbackUrl: sanitizeCallbackUrl(callbackUrl, baseUrl),
    })

    const forwardedProto = request.headers.get('x-forwarded-proto')
    const isSecure = forwardedProto === 'https' || request.nextUrl.protocol === 'https:'
    const cookieName = isSecure ? '__Secure-next-auth.session-token' : 'next-auth.session-token'

    // Use the NextResponse cookies API
    response.cookies.set(cookieName, sessionToken, {
      expires,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: isSecure,
    })

    return response
  } catch (error) {
    console.error('Exchange error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
