import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Privacy & cookie policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <div className="font-medium text-foreground">Controller</div>
              <div>SlotPoll</div>
              <div>contact@yourdomain.com</div>
            </div>
            <div>
              <div className="font-medium text-foreground">Hosting and data location</div>
              <div>Your Hosting Provider (hosting provider).</div>
              <div>Server location: Finland (EU/EEA).</div>
            </div>
            <div>
              <div className="font-medium text-foreground">What data we process</div>
              <ul className="list-disc pl-5 space-y-1">
                <li>Account data: name and email (for sign‑in and account management).</li>
                <li>Poll data: titles, descriptions, locations, time slots, and responses.</li>
                <li>Technical data: IP address, timestamps, and user‑agent in security logs.</li>
              </ul>
            </div>
            <div>
              <div className="font-medium text-foreground">Purpose and legal basis</div>
              <ul className="list-disc pl-5 space-y-1">
                <li>Provide the service (contract/legitimate interest).</li>
                <li>Secure the service and prevent abuse (legitimate interest).</li>
              </ul>
            </div>
            <div>
              <div className="font-medium text-foreground">Cookies</div>
              <div>
                SlotPoll uses essential cookies required for authentication and security (e.g.,
                session and CSRF cookies). We do not use advertising or analytics cookies. Because
                these cookies are strictly necessary, consent banners are not required, but we
                disclose their use here.
              </div>
            </div>
            <div>
              <div className="font-medium text-foreground">Email policy</div>
              <div>
                We only send transactional emails required to operate the service (such as sign‑in
                links and poll notifications). We do not send marketing or promotional emails.
              </div>
            </div>
            <div>
              <div className="font-medium text-foreground">International transfers</div>
              <div>
                Data is hosted in Finland. We do not intentionally transfer personal data outside
                the EU/EEA. If an EU/EEA transfer becomes necessary (e.g., to a service provider),
                we will use appropriate safeguards.
              </div>
            </div>
            <div>
              <div className="font-medium text-foreground">Sharing</div>
              <div>
                We do not sell your data. Data is only shared with service providers required to
                operate the application (hosting) or as required by law.
              </div>
            </div>
            <div>
              <div className="font-medium text-foreground">Data retention</div>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Polls:</strong> Automatically deleted 30 days after being closed. This
                  includes all associated data (time slots, votes, comments, and participant
                  responses). Poll owners may manually delete polls at any time.
                </li>
                <li>
                  <strong>Accounts:</strong> Kept while the account is active. You may delete your
                  account at any time, which will remove all your personal data.
                </li>
                <li>
                  <strong>Security logs:</strong> Retained for a limited period (typically 90 days)
                  necessary for security monitoring and troubleshooting.
                </li>
              </ul>
            </div>
            <div>
              <div className="font-medium text-foreground">Security</div>
              <div>
                We use industry‑standard security measures to protect data in transit and at rest.
                No method of transmission or storage is 100% secure, but we work to minimize risk.
              </div>
            </div>
            <div>
              <div className="font-medium text-foreground">Your rights</div>
              <div>
                You can request access, correction, deletion, or restriction of your data by
                contacting us at contact@yourdomain.com.
              </div>
            </div>
            <div>
              <div className="font-medium text-foreground">Complaints</div>
              <div>
                If you are in the EU/EEA, you may lodge a complaint with your local data protection
                authority.
              </div>
            </div>
            <div>Last updated: February 3, 2026.</div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
