import nodemailer from "nodemailer";
import { buildWelcomeEmailHtml } from "./templates/welcome";

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!user || !pass) return null;

  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.yandex.ru",
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,
      auth: { user, pass },
      connectionTimeout: 5000,
      socketTimeout: 10000,
    });
  }
  return _transporter;
}

const FROM_EMAIL = process.env.EMAIL_FROM || `Сводка <${process.env.SMTP_USER || "svodka.alerts@yandex.ru"}>`;

export async function sendEmail(to: string, subject: string, html: string) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log("[Email] SMTP not configured, skipping:", subject);
    return { ok: false, reason: "no_smtp" } as const;
  }

  try {
    await transporter.sendMail({ from: FROM_EMAIL, to, subject, html });
    return { ok: true } as const;
  } catch (error) {
    console.error("[Email] Failed to send:", error);
    return { ok: false, reason: "send_error" } as const;
  }
}

/** Alias for backward compat */
export const sendAlertEmail = sendEmail;

/**
 * Send welcome email to new user.
 */
export async function sendWelcomeEmail(to: string, userName: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.andreyai.ru";
  const html = buildWelcomeEmailHtml(userName, appUrl);
  return sendEmail(to, "Добро пожаловать в Сводку!", html);
}
