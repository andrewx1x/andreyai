import { Resend } from "resend";
import { buildWelcomeEmailHtml } from "./templates/welcome";

let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM_EMAIL = process.env.EMAIL_FROM || "Сводка <alerts@andreyai.ru>";

export async function sendEmail(to: string, subject: string, html: string) {
  const resend = getResend();
  if (!resend) {
    console.log("[Email] RESEND_API_KEY not set, skipping:", subject);
    return { ok: false, reason: "no_api_key" } as const;
  }

  try {
    await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
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
