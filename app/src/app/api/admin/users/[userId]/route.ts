import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'super_user') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userId } = await params
    const body = await request.json()
    const role = body?.role as 'super_user' | 'admin' | 'normal' | undefined
    const suspended = body?.suspended as boolean | undefined

    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    })
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (targetUser.role === 'super_user') {
      return NextResponse.json({ error: 'Cannot modify super user' }, { status: 403 })
    }

    const update: { role?: 'super_user' | 'admin' | 'normal'; suspended?: boolean } = {}
    if (role) {
      if (!['normal'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      }
      update.role = role
    }
    if (typeof suspended === 'boolean') {
      update.suspended = suspended
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No changes provided' }, { status: 400 })
    }

    await db.update(users).set(update).where(eq(users.id, userId))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'super_user') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userId } = await params
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    })
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (targetUser.role === 'super_user') {
      return NextResponse.json({ error: 'Cannot delete super user' }, { status: 403 })
    }
    await db.delete(users).where(eq(users.id, userId))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
