import { getServerSession } from 'next-auth'
import { authOptions } from './config'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  console.log('getCurrentUser - session:', session ? 'found' : 'not found', session?.user?.email || 'no email')
  return session?.user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/auth/signin')
  }
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
  })
  if (dbUser?.suspended) {
    redirect('/auth/suspended')
  }
  return user
}

export async function requireRole(allowedRoles: string[]) {
  const user = await requireAuth()
  if (!allowedRoles.includes(user.role)) {
    redirect('/dashboard')
  }
  return user
}

export async function isSuperUser() {
  const user = await getCurrentUser()
  return user?.role === 'super_user'
}

export async function isAdmin() {
  const user = await getCurrentUser()
  return user?.role === 'admin' || user?.role === 'super_user'
}
