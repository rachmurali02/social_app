import nodemailer from 'nodemailer'

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com'
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const EMAIL_FROM = process.env.EMAIL_FROM || 'MeetUp AI <noreply@example.com>'

function getTransporter() {
  if (!SMTP_USER || !SMTP_PASS) return null
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
}

export async function sendWelcomeEmail(to: string, name: string): Promise<boolean> {
  const transporter = getTransporter()
  if (!transporter) return false
  try {
    const displayName = name || to.split('@')[0]
    await transporter.sendMail({
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
    return true
  } catch (e) {
    console.error('Send welcome email:', e)
    return false
  }
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  name?: string
): Promise<boolean> {
  const transporter = getTransporter()
  if (!transporter) return false
  try {
    const displayName = name || to.split('@')[0]
    await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject: 'Reset your MeetUp AI password',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h1 style="color: #4f46e5;">Reset your password</h1>
          <p>Hi ${displayName},</p>
          <p>We received a request to reset your password. Click the link below (valid for 1 hour):</p>
          <p><a href="${resetUrl}" style="color: #6366f1; font-weight: 600;">${resetUrl}</a></p>
          <p>If you didn't request this, you can ignore this email.</p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">— MeetUp AI</p>
        </div>
      `,
    })
    return true
  } catch (e) {
    console.error('Send password reset email:', e)
    return false
  }
}
