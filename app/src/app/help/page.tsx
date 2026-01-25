import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const faqs = [
  {
    q: 'How do I create a poll?',
    a: 'Sign in, click “Create Poll,” add a title, optional description, and time slots, then share the link.',
  },
  {
    q: 'Do participants need an account?',
    a: 'No. Anyone with the link can vote by providing a name and email (if required by the poll).',
  },
  {
    q: 'Can I edit or close a poll?',
    a: 'Yes. As the owner, you can edit details, adjust time slots, close, or reopen the poll.',
  },
  {
    q: 'Can I change or delete my vote?',
    a: 'Yes. You can submit your vote again to update it or use “Delete My Vote.”',
  },
  {
    q: 'Why do time slots show in local time?',
    a: 'Slots are stored in UTC and displayed in each viewer’s local time zone for clarity.',
  },
  {
    q: 'Is there a demo poll?',
    a: 'Yes. Visit /polls/demo to explore a sample poll.',
  },
]

export default function HelpPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-10 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Help</h1>
          <p className="text-muted-foreground mt-2">Quick answers to common questions.</p>
        </div>
        <div className="grid gap-4">
          {faqs.map((item) => (
            <Card key={item.q}>
              <CardHeader>
                <CardTitle className="text-lg">{item.q}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{item.a}</CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
