const nodemailer = require('nodemailer')

const buildTransporter = () => {
  // Generic SMTP — works with Gmail, Outlook, etc.
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT) || 587,
      secure: parseInt(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })
  }

  // SendGrid fallback
  if (process.env.SENDGRID_API_KEY) {
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    })
  }

  return null
}

const sendEmail = async ({ to, subject, html }) => {
  const transporter = buildTransporter()

  if (!transporter) {
    // Dev fallback — print to console so the verification link is usable immediately
    console.error('─────────────────────────────────────────')
    console.error(`[email] No SMTP configured. Printing instead.`)
    console.error(`TO:      ${to}`)
    console.error(`SUBJECT: ${subject}`)
    console.error(`BODY:\n${html.replace(/<[^>]+>/g, '')}`)
    console.error('─────────────────────────────────────────')
    return
  }

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@reclaim.com',
    to,
    subject,
    html
  })
}

module.exports = { sendEmail }
