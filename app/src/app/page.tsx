import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/header'
import { Calendar, Users, Clock, Shield, Rocket, PlayCircle } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth/session'

export default async function HomePage() {
  const user = await getCurrentUser()
  if (user) {
    redirect('/dashboard')
  }
  return (
    <div className="min-h-screen">
      <Header />

      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">
            Simple Scheduling Made Easy
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Find the best time for your meetings and events. SlotPoll is a lightweight,
            self-hosted alternative to Doodle for team scheduling and polling.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/signin">
              <Button size="lg">Get Started</Button>
            </Link>
            <Link href="/polls/demo">
              <Button size="lg" variant="outline">View Demo</Button>
            </Link>
          </div>
          <div className="mt-12 max-w-4xl mx-auto rounded-2xl border bg-muted/40 p-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                  <Rocket className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Get Started</h3>
                <p className="text-sm text-muted-foreground">
                  Sign in with email, create a poll, and share the link in minutes.
                </p>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                  <PlayCircle className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Demo</h3>
                <p className="text-sm text-muted-foreground">
                  Explore a sample poll to see voting and results without signing in.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Easy Scheduling</h3>
            <p className="text-sm text-muted-foreground">
              Create polls with multiple date and time options in seconds
            </p>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Collaborative</h3>
            <p className="text-sm text-muted-foreground">
              Share polls with your team and collect responses effortlessly
            </p>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Real-time Updates</h3>
            <p className="text-sm text-muted-foreground">
              See responses as they come in and find the best time instantly
            </p>
          </div>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Self-Hosted</h3>
            <p className="text-sm text-muted-foreground">
              Your data stays on your infrastructure. Full control and privacy
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-muted rounded-lg p-8">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-muted-foreground mb-6">
            Create your first poll in less than a minute
          </p>
          <Link href="/auth/signin">
            <Button size="lg">Sign In with Email</Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
