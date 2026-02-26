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

function buildCalendarLinks(params: {
  placeName: string
  address: string
  time: string
  activity: string
  inviterName: string
  attendeeNames?: string[]
}) {
  const { placeName, address, time, activity, inviterName, attendeeNames } = params
  const title = `Meetup at ${placeName}`
  const withLine =
    attendeeNames && attendeeNames.length > 0
      ? `With: ${attendeeNames.join(', ')}`
      : `Invited by: ${inviterName}`
  const description = `${activity} meetup\n\n${withLine}`
  const startTime = new Date(`${new Date().toISOString().split('T')[0]}T${time}`)
  const endTime = new Date(startTime)
  endTime.setHours(endTime.getHours() + 2)
  const formatDt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${formatDt(startTime)}/${formatDt(endTime)}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(address)}`
  const icalData = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${formatDt(startTime)}
DTEND:${formatDt(endTime)}
SUMMARY:${title.replace(/\n/g, '\\n')}
DESCRIPTION:${description.replace(/\n/g, '\\n')}
LOCATION:${address}
END:VEVENT
END:VCALENDAR`
  return { googleUrl, icalData }
}

export async function sendMeetupInviteEmail(params: {
  to: string
  inviteeName?: string
  inviterName?: string
  placeName?: string
  address?: string
  time?: string
  activity?: string
  appUrl?: string
}): Promise<boolean> {
  const transporter = getTransporter()
  if (!transporter) return false
  const {
    to,
    inviteeName,
    inviterName,
    placeName,
    address,
    time,
    activity,
    appUrl,
  } = params
  try {
    const displayInvitee = inviteeName || to.split('@')[0]
    const displayInviter = inviterName || 'a friend'
    const safePlace = placeName || 'a meetup spot'
    const safeAddress = address || ''
    const safeActivity = activity || 'a meetup'
    const safeTime = time || ''
    const baseUrl = (appUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '')
    const invitationsUrl = `${baseUrl}/invitations`

    const { googleUrl } = buildCalendarLinks({
      placeName: safePlace,
      address: safeAddress,
      time: safeTime,
      activity: safeActivity,
      inviterName: displayInviter,
      attendeeNames: [displayInviter, displayInvitee],
    })

    const subject =
      safePlace !== 'a meetup spot'
        ? `1 pending invite from ${displayInviter} – ${safeActivity} at ${safePlace}`
        : `1 pending invite from ${displayInviter}`

    await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
          <h1 style="color: #4f46e5; margin-bottom: 16px;">You have 1 pending invite from ${displayInviter}</h1>
          <p>Hi ${displayInvitee},</p>
          <p><strong>${displayInviter}</strong> invited you to a meetup. Summary:</p>
          <div style="background:#f3f4f6;border-radius:12px;padding:16px;margin:16px 0;">
            <p style="margin:0 0 8px 0;"><strong>Activity:</strong> ${safeActivity}</p>
            <p style="margin:0 0 8px 0;"><strong>Place:</strong> ${safePlace}</p>
            ${safeAddress ? `<p style="margin:0 0 8px 0;"><strong>Address:</strong> ${safeAddress}</p>` : ''}
            ${safeTime ? `<p style="margin:0;"><strong>Time:</strong> ${safeTime}</p>` : ''}
          </div>
          <p style="margin-top: 20px;">
            Add to your calendar:
          </p>
          <p>
            <a href="${googleUrl}" style="background:#34a853;color:#ffffff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600;display:inline-block;margin-right:8px;">
              Add to Google Calendar
            </a>
          </p>
          <p style="margin-top: 16px;">
            Or respond in the app:
          </p>
          <p>
            <a href="${invitationsUrl}" style="background:#4f46e5;color:#ffffff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600;display:inline-block;">
              View invitation
            </a>
          </p>
          <p style="color:#6b7280;font-size:13px;margin-top:24px;">
            If you weren’t expecting this, you can ignore this email.
          </p>
          <p style="color:#6b7280;font-size:13px;margin-top:8px;">— MeetUp AI</p>
        </div>
      `,
    })
    return true
  } catch (e) {
    console.error('Send meetup invite email:', e)
    return false
  }
}

export async function sendMeetupConfirmedToInvitee(params: {
  to: string
  inviteeName?: string
  placeName?: string
  address?: string
  time?: string
  activity?: string
  inviterName?: string
  mapUrl?: string
  appUrl?: string
}): Promise<boolean> {
  const transporter = getTransporter()
  if (!transporter) return false
  const { to, inviteeName, placeName, address, time, activity, inviterName, mapUrl, appUrl } = params
  try {
    const displayName = inviteeName || to.split('@')[0]
    const safePlace = placeName || 'your meetup'
    const safeAddress = address || ''
    const safeTime = time || ''
    const safeActivity = activity || 'meetup'
    const safeInviter = inviterName || 'a friend'
    const baseUrl = (appUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '')
    const { googleUrl } = buildCalendarLinks({
      placeName: safePlace,
      address: safeAddress,
      time: safeTime,
      activity: safeActivity,
      inviterName: safeInviter,
      attendeeNames: [safeInviter, displayName],
    })
    const timeLine = safeTime ? `<p><strong>Time:</strong> ${safeTime}</p>` : ''
    const mapLine = mapUrl
      ? `<p><a href="${mapUrl}" style="color:#6366f1;font-weight:600;">View on map</a></p>`
      : ''

    await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject: `You confirmed – add ${safePlace} to your calendar`,
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
          <h1 style="color: #059669; margin-bottom: 16px;">You’re confirmed ✓</h1>
          <p>Hi ${displayName},</p>
          <p>You accepted the invite to ${safeActivity} at <strong>${safePlace}</strong>.</p>
          <p><strong>Where:</strong> ${safeAddress}</p>
          ${timeLine}
          ${mapLine}
          <p style="margin-top: 24px;">Add it to your calendar:</p>
          <p>
            <a href="${googleUrl}" style="background:#34a853;color:#ffffff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600;display:inline-block;">
              Add to Google Calendar
            </a>
          </p>
          <p style="color:#6b7280;font-size:13px;margin-top:24px;">— MeetUp AI</p>
        </div>
      `,
    })
    return true
  } catch (e) {
    console.error('Send meetup confirmed to invitee:', e)
    return false
  }
}

export async function sendMeetupAcceptedToCreator(params: {
  to: string
  creatorName?: string
  accepterName?: string
  placeName?: string
  address?: string
  time?: string
  activity?: string
  appUrl?: string
}): Promise<boolean> {
  const transporter = getTransporter()
  if (!transporter) return false
  const { to, creatorName, accepterName, placeName, address, time, activity, appUrl } = params
  try {
    const displayCreator = creatorName || to.split('@')[0]
    const safeAccepter = accepterName || 'Someone'
    const safePlace = placeName || 'your meetup'
    const safeAddress = address || ''
    const safeTime = time || ''
    const safeActivity = activity || 'meetup'
    const baseUrl = (appUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '')
    const meetupsUrl = `${baseUrl}/meetups`
    const { googleUrl } = buildCalendarLinks({
      placeName: safePlace,
      address: safeAddress,
      time: safeTime,
      activity: safeActivity,
      inviterName: displayCreator,
      attendeeNames: [displayCreator, safeAccepter],
    })
    const timeLine = safeTime ? `<p><strong>Time:</strong> ${safeTime}</p>` : ''

    await transporter.sendMail({
      from: EMAIL_FROM,
      to,
      subject: `${safeAccepter} accepted your invite to ${safePlace}`,
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto;">
          <h1 style="color: #4f46e5; margin-bottom: 16px;">${safeAccepter} is in! 🎉</h1>
          <p>Hi ${displayCreator},</p>
          <p><strong>${safeAccepter}</strong> accepted your invite to ${safeActivity} at <strong>${safePlace}</strong>.</p>
          <p><strong>Where:</strong> ${safeAddress}</p>
          ${timeLine}
          <p style="margin-top: 24px;">Add to your calendar:</p>
          <p>
            <a href="${googleUrl}" style="background:#34a853;color:#ffffff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600;display:inline-block;">
              Add to Google Calendar
            </a>
          </p>
          <p style="margin-top: 16px;">
            <a href="${meetupsUrl}" style="color:#6366f1;font-weight:600;">View meetups</a>
          </p>
          <p style="color:#6b7280;font-size:13px;margin-top:24px;">— MeetUp AI</p>
        </div>
      `,
    })
    return true
  } catch (e) {
    console.error('Send meetup accepted to creator:', e)
    return false
  }
}
