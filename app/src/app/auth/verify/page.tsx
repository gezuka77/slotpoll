import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Mail } from 'lucide-react'
import Link from 'next/link'

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 mb-2">
            <Calendar className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">SlotPoll</span>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-center">Check your email</CardTitle>
            <CardDescription className="text-center">
              We've sent you a magic link to sign in
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Click the link in the email to sign in to your account. The link will expire in 24 hours.
            </p>
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">
                Didn't receive an email?
              </p>
              <Link href="/auth/signin" className="text-sm text-primary hover:underline">
                Try again
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
