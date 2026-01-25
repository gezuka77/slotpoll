'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { sanitizeCallbackUrl } from '@/lib/security'

function ConfirmContent() {
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [callbackUrl, setCallbackUrl] = useState<string>('/dashboard')
  const [hasParsed, setHasParsed] = useState(false)

  useEffect(() => {
    // Prefer fragment parameters to avoid scanners sending tokens.
    const hash = window.location.hash?.replace(/^#/, '') || ''
    const hashParams = new URLSearchParams(hash)

    const tokenFromHash = hashParams.get('token')
    const emailFromHash = hashParams.get('email')
    const callbackFromHash = hashParams.get('callbackUrl')

    const tokenFromQuery = searchParams.get('token')
    const emailFromQuery = searchParams.get('email')
    const callbackFromQuery = searchParams.get('callbackUrl')

    setToken(tokenFromHash || tokenFromQuery)
    setEmail(emailFromHash || emailFromQuery)
    const baseUrl = window.location.origin
    setCallbackUrl(sanitizeCallbackUrl(callbackFromHash || callbackFromQuery, baseUrl))
    setHasParsed(true)
  }, [searchParams])

  const handleConfirm = async () => {
    if (!token || !email) {
      setError('Invalid magic link. Please request a new one.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // POST to exchange endpoint instead of redirecting to callback
      const response = await fetch('/api/auth/exchange', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          email,
          callbackUrl,
        }),
        credentials: 'include', // Important: include cookies
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to sign in. Please try again.')
        setIsLoading(false)
        return
      }

      // Small delay to ensure cookie is saved
      await new Promise(resolve => setTimeout(resolve, 100))

      // Redirect to dashboard
      window.location.href = data.callbackUrl || '/dashboard'
    } catch (err) {
      console.error('Sign in error:', err)
      setError('An error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  if (!hasParsed) {
    return <LoadingState />
  }

  if (!token || !email) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-destructive">Invalid Link</CardTitle>
          <CardDescription>
            This magic link is invalid or has expired.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Link href="/auth/signin">
            <Button>Request New Link</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center space-x-2 mb-2">
          <Calendar className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold">SlotPoll</span>
        </Link>
      </div>

      <Card>
        <CardHeader className="text-center">
          <CardTitle>Confirm Sign In</CardTitle>
          <CardDescription>
            Click the button below to sign in as <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="text-sm text-destructive text-center">{error}</div>
          )}

          <Button
            onClick={handleConfirm}
            className="w-full"
            disabled={isLoading}
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In to SlotPoll'
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            This extra step prevents automated scanners from consuming your magic link.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function LoadingState() {
  return (
    <Card className="w-full max-w-md">
      <CardContent className="py-12 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </CardContent>
    </Card>
  )
}

export default function ConfirmSignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <Suspense fallback={<LoadingState />}>
        <ConfirmContent />
      </Suspense>
    </div>
  )
}
