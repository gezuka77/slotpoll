import { NextAuthOptions } from 'next-auth'
import EmailProvider from 'next-auth/providers/email'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { db } from '@/db'
import { sendMagicLinkEmail } from '@/lib/email/templates'
import { eq } from 'drizzle-orm'
import { users, accounts, sessions, verificationTokens } from '@/db/schema'

export const authOptions: NextAuthOptions = {
  debug: process.env.NEXTAUTH_DEBUG === 'true',
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }) as any,
  providers: [
    EmailProvider({
      server: '',
      from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
      sendVerificationRequest: async ({ identifier: email, url }) => {
        await sendMagicLinkEmail(email, url)
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify',
    error: '/auth/error',
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id

        // Fetch user role
        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, user.id),
        })

        if (dbUser) {
          session.user.role = dbUser.role
          session.user.suspended = dbUser.suspended
        }
      }
      return session
    },
    async signIn({ user }) {
      if (user.email) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.email, user.email),
        })
        if (dbUser?.suspended) {
          return false
        }
      }

      const rawSuperUsers = process.env.SUPER_USER_EMAIL || ''
      const superUserEmails = rawSuperUsers
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean)

      if (user.email) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.email, user.email),
        })

        if (dbUser) {
          const isSuperEmail = superUserEmails.includes(user.email.toLowerCase())
          if (isSuperEmail && dbUser.role !== 'super_user') {
            await db.update(users).set({ role: 'super_user' }).where(eq(users.id, dbUser.id))
          } else if (!isSuperEmail && dbUser.role === 'super_user') {
            await db.update(users).set({ role: 'normal' }).where(eq(users.id, dbUser.id))
          }
        }
      }
      return true
    },
  },
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // Use secure cookies when served over HTTPS (Traefik, production, etc.)
  useSecureCookies: process.env.NEXTAUTH_URL?.startsWith('https://') ?? false,
  secret: process.env.NEXTAUTH_SECRET,
}

if (
  process.env.NODE_ENV === 'production' &&
  !process.env.NEXTAUTH_SECRET &&
  process.env.NEXT_PHASE !== 'phase-production-build'
) {
  throw new Error('NEXTAUTH_SECRET must be set in production.')
}
