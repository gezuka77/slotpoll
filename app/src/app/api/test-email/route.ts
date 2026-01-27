import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function GET() {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)

    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'SlotPoll <noreply@yourdomain.com>',
      to: 'contact@yourdomain.com',
      subject: 'Test Email from SlotPoll',
      html: '<p>This is a test email to verify Resend configuration.</p>',
    })

    return NextResponse.json({
      success: true,
      result,
      env: {
        EMAIL_FROM: process.env.EMAIL_FROM,
        RESEND_API_KEY: process.env.RESEND_API_KEY ? 'SET' : 'NOT SET',
      }
    })
  } catch (error: any) {
    console.error('Failed to send test email:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error,
      stack: error.stack,
      env: {
        EMAIL_FROM: process.env.EMAIL_FROM,
        RESEND_API_KEY: process.env.RESEND_API_KEY ? 'SET' : 'NOT SET',
      }
    }, { status: 500 })
  }
}
