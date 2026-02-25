const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM || 'MeetUp AI <onboarding@resend.dev>'

export async function sendWelcomeEmail(to: string, name: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(RESEND_API_KEY)
    const displayName = name || to.split('@')[0]
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: 'Welcome to MeetUp AI',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h1 style="color: #4f46e5;">Welcome to MeetUp AI</h1>
          <p>Hi ${displayName},</p>
          <p>You're in! Plan meetups with friends and get AI-powered spot recommendations.</p>
          <p>Open the app on your phone or computer to start connecting.</p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">— The MeetUp AI community</p>
        </div>
      `,
    })
    if (error) {
      console.error('Welcome email error:', error)
      return false
    }
    return true
  } catch (e) {
    console.error('Send welcome email:', e)
    return false
  }
}
