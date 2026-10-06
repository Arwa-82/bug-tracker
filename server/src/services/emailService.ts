import nodemailer from "nodemailer";

// Ethereal is a fake SMTP service for testing — emails are captured in a
// disposable inbox, never actually delivered. createTestAccount() generates
// a fresh throwaway account automatically, no signup needed.
//
// We create the transporter lazily (on first use) and cache it, since
// createTestAccount() makes a network call — no need to do that on
// every server startup if email is never sent.
let transporterPromise: ReturnType<typeof createTransporter> | null = null;

async function createTransporter() {
  const testAccount = await nodemailer.createTestAccount();

  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = createTransporter();
  }
  return transporterPromise;
}

// Sends the password reset email. Returns the Ethereal preview URL so we
// can log it to the console — since Ethereal doesn't deliver real email,
// this URL is the only way to actually "receive" and view the message.
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<string> {
  const transporter = await getTransporter();

  const info = await transporter.sendMail({
    from: '"BugBoard" <no-reply@bugboard.dev>',
    to,
    subject: "Reset your BugBoard password",
    text: `We received a request to reset your password. Click the link below to choose a new one:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email.`,
    html: `
      <p>We received a request to reset your password.</p>
      <p><a href="${resetUrl}">Click here to choose a new password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    `,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  return previewUrl || "";
}