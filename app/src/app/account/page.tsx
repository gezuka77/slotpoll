'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Loader2, Trash2, Save } from 'lucide-react'

export default function AccountPage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [name, setName] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [router, status])

  useEffect(() => {
    if (session?.user?.name) {
      setName(session.user.name)
    }
  }, [session?.user?.name])

  const handleSaveName = async () => {
    try {
      setIsSaving(true)
      setError(null)
      setSuccessMessage(null)

      const response = await fetch('/api/user/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update name')
      }

      // Update the session
      await update()
      setSuccessMessage('Name updated successfully')

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true)
      setError(null)

      const response = await fetch('/api/user/delete', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete account')
      }

      // Sign out and redirect
      await signOut({ callbackUrl: '/' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsDeleting(false)
    }
  }

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-10 max-w-3xl">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
              Loading account...
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  const hasNameChanged = name.trim() !== (session.user.name || '')

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <h1 className="text-3xl font-bold mb-8">Account</h1>

        <div className="space-y-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {successMessage && (
                <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded">
                  {successMessage}
                </div>
              )}

              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive rounded">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Name
                </label>
                <div className="flex gap-2">
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isSaving}
                  />
                  <Button
                    onClick={handleSaveName}
                    disabled={!hasNameChanged || isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This name will be used as the default when you participate in polls
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Email</div>
                <div className="text-sm text-muted-foreground">{session.user.email}</div>
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Role</div>
                <div className="text-sm text-muted-foreground capitalize">
                  {session.user.role?.replace('_', ' ') || 'Normal User'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone - Hidden for Super Users */}
          {session.user.role !== 'super_user' && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>Irreversible actions</CardDescription>
              </CardHeader>
              <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Delete Account</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Permanently delete your account and all associated data. This action cannot be undone.
                    Your participation in polls will be anonymized (shown as "Deleted User"), but votes
                    will be preserved to maintain poll integrity.
                  </p>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={isDeleting}>
                        {isDeleting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Account
                          </>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your account and remove
                          your personal data from our servers. Your votes in polls will be preserved but
                          anonymized.
                          <br /><br />
                          <strong>What will be deleted:</strong>
                          <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>All your polls and their data</li>
                            <li>Your account information</li>
                            <li>Your session data</li>
                          </ul>
                          <br />
                          <strong>What will be anonymized:</strong>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Your name in polls you participated in (shown as "Deleted User")</li>
                            <li>Your votes will remain but without personal information</li>
                          </ul>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Yes, delete my account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
          )}
        </div>
      </main>
    </div>
  )
}
