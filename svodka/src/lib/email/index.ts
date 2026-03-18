import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM_EMAIL = "Сводка <alerts@svodka.app>";

export async function sendAlertEmail(
  to: string,
  subject: string,
  html: string
) {
  const resend = getResend();
  if (!resend) {
    console.log("[Email] RESEND_API_KEY not set, skipping:", subject);
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error("[Email] Failed to send:", error);
  }
}
