import nodemailer from 'nodemailer';
import {
  FRONTEND_URL,
  MAIL_FROM,
  SMTP_HOST,
  SMTP_PASS,
  SMTP_PORT,
  SMTP_USER,
} from '../config';


let transporter: nodemailer.Transporter | null = null;

export function isEmailConfigured(): boolean {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS && MAIL_FROM);
}

function getTransporter(): nodemailer.Transporter | null {
  if (!isEmailConfigured()) return null;

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  }

  return transporter;
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  const resetUrl = `${FRONTEND_URL.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
  const mailer = getTransporter();

  if (!mailer) {
    throw new Error('Email service is not configured');
  }

  await mailer.sendMail({
    from: MAIL_FROM,
    to: email,
    subject: 'Reset your Tiffin Mate password',
    text: `Reset your password using this link: ${resetUrl}\n\nThis link expires in one hour.`,
    html: [
      '<p>You requested a password reset for your Tiffin Mate account.</p>',
      `<p><a href="${resetUrl}">Reset your password</a></p>`,
      '<p>This link expires in one hour. If you did not request it, ignore this email.</p>',
    ].join(''),
  });

  return true;
}
