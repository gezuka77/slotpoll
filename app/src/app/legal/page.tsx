import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default function LegalNoticePage() {
  const appName = process.env.APP_NAME || 'SlotPoll'
  const contactEmail = process.env.LEGAL_CONTACT_EMAIL || 'contact@yourdomain.com'
  const hostingProvider = process.env.HOSTING_PROVIDER || 'Your Hosting Provider'
  const serverLocation = process.env.SERVER_LOCATION || 'Your Country'
  const jurisdiction = process.env.LEGAL_JURISDICTION || 'Your Country'
  const jurisdictionCity = process.env.LEGAL_JURISDICTION_CITY || 'Your City, Your Country'

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Legal notice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <div className="font-medium text-foreground">Service provider</div>
              <div>{appName}</div>
              <div>{contactEmail}</div>
            </div>
            <div>
              <div className="font-medium text-foreground">Hosting</div>
              <div>{hostingProvider}</div>
              <div>Server location: {serverLocation}</div>
            </div>
            <div>
              <div className="font-medium text-foreground">Service</div>
              <div>{appName} – scheduling and polling application.</div>
            </div>
            <div>
              <div className="font-medium text-foreground">Contact for notices</div>
              <div>
                For legal or privacy notices, contact {appName} at {contactEmail}.
              </div>
            </div>
            <div>
              <div className="font-medium text-foreground">Governing law and venue</div>
              <div>
                These terms are governed by the laws of {jurisdiction}. Any disputes shall be finally
                resolved by arbitration in {jurisdictionCity}, unless mandatory law requires another
                venue.
              </div>
            </div>
            <div>
              <div className="font-medium text-foreground">Liability</div>
              <div>
                The service is provided "as is" without warranties. To the fullest extent permitted
                by law, the provider disclaims all warranties and is not liable for indirect,
                incidental, special, consequential, or punitive damages, or any loss of data,
                revenue, or profits, even if advised of the possibility of such damages.
              </div>
            </div>
            <div>
              <div className="font-medium text-foreground">Acceptable use</div>
              <div>
                You agree not to misuse the service or attempt to disrupt, reverse engineer, or
                bypass security measures. Abuse may result in suspension or termination.
              </div>
            </div>
            <div>
              <div className="font-medium text-foreground">Data retention and GDPR compliance</div>
              <div>
                In compliance with GDPR data minimization principles, {appName} automatically deletes
                polls 30 days after they are closed. This ensures that personal data (participant
                names, emails, and responses) is not retained longer than necessary. Poll owners may
                manually delete polls at any time. See our{' '}
                <a href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </a>{' '}
                for complete data retention information.
              </div>
            </div>
            <div>Last updated: February 3, 2026.</div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
