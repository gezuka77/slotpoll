import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SuspendedPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>Account suspended</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Your account has been suspended. Please contact the site administrator for help.
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
