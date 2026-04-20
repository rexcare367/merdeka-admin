import nodemailer from "nodemailer"

function createTransport() {
  const host = process.env.SMTP_HOST
  if (!host) {
    return null
  }
  const port = Number(process.env.SMTP_PORT ?? "587")
  const secure = process.env.SMTP_SECURE === "true"
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASSWORD

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth:
      user && pass
        ? {
            user,
            pass,
          }
        : undefined,
  })
}

export function getMailTransport() {
  return createTransport()
}

export async function sendMail(options: nodemailer.SendMailOptions) {
  const transport = createTransport()
  if (!transport) {
    throw new Error("SMTP is not configured (set SMTP_HOST)")
  }
  const from =
    (typeof options.from === "string" ? options.from : undefined) ??
    process.env.EMAIL_FROM ??
    process.env.SMTP_USER
  if (!from) {
    throw new Error("Set EMAIL_FROM or pass options.from")
  }
  return transport.sendMail({ ...options, from })
}
