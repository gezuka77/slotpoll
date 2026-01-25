import { Resend } from 'resend'
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Heading,
  Hr,
} from '@react-email/components'
import { render } from '@react-email/render'
import { checkRateLimit, isValidEmail } from '@/lib/security'

// Helper function to get Resend client
function getResendClient() {
  return new Resend(process.env.RESEND_API_KEY)
}

// Magic Link Email Template
function MagicLinkEmail({ url }: { url: string }) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Sign in to SlotPoll</Heading>
          <Text style={text}>
            Click the button below to sign in to your SlotPoll account. This link will expire in 24 hours.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={url}>
              Sign In
            </Button>
          </Section>
          <Text style={text}>
            Or copy and paste this URL into your browser:
          </Text>
          <Text style={link}>{url}</Text>
          <Hr style={hr} />
          <Text style={footer}>
            If you didn't request this email, you can safely ignore it.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

// Poll Invitation Email Template
function PollInvitationEmail({
  pollTitle,
  pollUrl,
  creatorName,
}: {
  pollTitle: string
  pollUrl: string
  creatorName: string
}) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>You've been invited to a poll</Heading>
          <Text style={text}>
            {creatorName} has invited you to participate in: <strong>{pollTitle}</strong>
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={pollUrl}>
              View Poll
            </Button>
          </Section>
          <Text style={text}>
            Or copy and paste this URL into your browser:
          </Text>
          <Text style={link}>{pollUrl}</Text>
          <Hr style={hr} />
          <Text style={footer}>
            Powered by SlotPoll - Simple scheduling made easy
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

// Poll Response Notification
function PollResponseEmail({
  pollTitle,
  participantName,
  pollUrl,
}: {
  pollTitle: string
  participantName: string
  pollUrl: string
}) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>New response on your poll</Heading>
          <Text style={text}>
            {participantName} has responded to your poll: <strong>{pollTitle}</strong>
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={pollUrl}>
              View Responses
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            Powered by SlotPoll - Simple scheduling made easy
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

// Email sending functions
export async function sendMagicLinkEmail(email: string, url: string) {
  try {
    const normalizedEmail = String(email || '').trim().toLowerCase()
    if (!isValidEmail(normalizedEmail)) {
      throw new Error('Invalid email')
    }
    const rate = checkRateLimit(`magiclink:${normalizedEmail}`, 5, 15 * 60 * 1000)
    if (!rate.allowed) {
      throw new Error('Too many requests')
    }

    // Convert callback URL to confirmation page URL using a fragment so scanners won't send the token.
    // Original: /api/auth/callback/email?callbackUrl=...&token=...&email=...
    // New: /auth/confirm#token=...&email=...&callbackUrl=...
    const originalUrl = new URL(url)
    const token = originalUrl.searchParams.get('token') || ''
    const callbackUrl = originalUrl.searchParams.get('callbackUrl') || ''
    const confirmUrl = new URL('/auth/confirm', originalUrl)
    confirmUrl.search = ''
    const hashParams = new URLSearchParams()
    if (token) hashParams.set('token', token)
    if (email) hashParams.set('email', email)
    if (callbackUrl) hashParams.set('callbackUrl', callbackUrl)
    confirmUrl.hash = hashParams.toString()
    const html = await render(<MagicLinkEmail url={confirmUrl.toString()} />)

    const resend = getResendClient()
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'SlotPoll <noreply@yourdomain.com>',
      to: email,
      subject: 'Sign in to SlotPoll',
      html,
    })
    void result
  } catch (error) {
    throw new Error('Failed to send magic link email')
  }
}

export async function sendPollInvitationEmail(
  email: string,
  pollTitle: string,
  pollUrl: string,
  creatorName: string
) {
  try {
    const html = await render(
      <PollInvitationEmail
        pollTitle={pollTitle}
        pollUrl={pollUrl}
        creatorName={creatorName}
      />
    )

    const resend = getResendClient()
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'SlotPoll <noreply@yourdomain.com>',
      to: email,
      subject: `You're invited: ${pollTitle}`,
      html,
    })
  } catch (error) {
    console.error('Failed to send poll invitation email:', error)
    throw new Error('Failed to send poll invitation email')
  }
}

export async function sendPollResponseEmail(
  email: string,
  pollTitle: string,
  participantName: string,
  pollUrl: string
) {
  try {
    const html = await render(
      <PollResponseEmail
        pollTitle={pollTitle}
        participantName={participantName}
        pollUrl={pollUrl}
      />
    )

    const resend = getResendClient()
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'SlotPoll <noreply@yourdomain.com>',
      to: email,
      subject: `New response on: ${pollTitle}`,
      html,
    })
  } catch (error) {
    console.error('Failed to send poll response email:', error)
    // Don't throw - notification emails shouldn't break the flow
  }
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 40px',
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 40px',
}

const buttonContainer = {
  padding: '27px 40px',
}

const button = {
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
}

const link = {
  color: '#2563eb',
  fontSize: '14px',
  textDecoration: 'underline',
  padding: '0 40px',
  wordBreak: 'break-all' as const,
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 40px',
}

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  padding: '0 40px',
}
